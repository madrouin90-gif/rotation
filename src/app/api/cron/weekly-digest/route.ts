import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { daysSince, STALE_SLOT_DAYS } from "@/lib/dates";

// Planifié via vercel.json : vendredi 16:00 UTC (~11-12h à Montréal, selon l'heure d'été).
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface DigestMemberRow {
  id: string;
  group_id: string;
  pseudo: string;
  email: string;
  email_verify_token: string | null;
  groups: { name: string; code: string } | null;
}

interface ShareEventRow {
  occurred_at: string;
  items: { title: string; artist_name: string | null } | null;
  members: { pseudo: string } | null;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const sinceIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const { data: members, error: membersError } = await supabaseAdmin
    .from("members")
    .select("id, group_id, pseudo, email, email_verify_token, groups(name, code)")
    .not("email_verified_at", "is", null)
    .eq("is_active", true)
    .eq("approval_status", "approved");

  if (membersError || !members) {
    return NextResponse.json({ error: "Impossible de charger les membres." }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  // Itération séquentielle : volume attendu faible (petits groupes d'amis), pas besoin
  // de paralléliser au prix de la simplicité.
  for (const member of members as unknown as DigestMemberRow[]) {
    try {
      const groupName = member.groups?.name ?? "ton groupe";
      const groupCode = member.groups?.code ?? "";

      const { data: siblings } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("group_id", member.group_id)
        .neq("id", member.id);
      const siblingIds = (siblings ?? []).map((s) => s.id);

      const { data: eventRows } =
        siblingIds.length > 0
          ? await supabaseAdmin
              .from("share_events")
              .select("occurred_at, items(title, artist_name), members(pseudo)")
              .in("member_id", siblingIds)
              .gt("occurred_at", sinceIso)
              .order("occurred_at", { ascending: false })
              .limit(8)
          : { data: [] as ShareEventRow[] };

      const { data: myItems } = await supabaseAdmin.from("items").select("id").eq("member_id", member.id);
      const myItemIds = (myItems ?? []).map((i) => i.id);

      let commentsCount = 0;
      let listensCount = 0;
      if (myItemIds.length > 0) {
        const { count: cCount } = await supabaseAdmin
          .from("comments")
          .select("id", { count: "exact", head: true })
          .in("item_id", myItemIds)
          .gt("created_at", sinceIso);
        commentsCount = cCount ?? 0;

        const { count: lCount } = await supabaseAdmin
          .from("engagement_events")
          .select("id", { count: "exact", head: true })
          .in("item_id", myItemIds)
          .eq("event_type", "listen")
          .gt("created_at", sinceIso);
        listensCount = lCount ?? 0;
      }

      const staleBeforeIso = new Date(Date.now() - STALE_SLOT_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: staleShares } = await supabaseAdmin
        .from("shares")
        .select("rank, added_at")
        .eq("member_id", member.id)
        .lt("added_at", staleBeforeIso)
        .order("rank", { ascending: true });

      const novelties = (eventRows ?? []) as unknown as ShareEventRow[];
      const hasNovelties = novelties.length > 0;
      const hasComments = commentsCount > 0;
      const hasListens = listensCount > 0;
      const hasStale = (staleShares ?? []).length > 0;

      if (!hasNovelties && !hasComments && !hasListens && !hasStale) {
        skipped++;
        continue;
      }

      // Désinscription : réutilise email_verify_token, régénéré s'il a déjà été consommé
      // par la vérification initiale. Le lien remet email_verified_at à null — le membre
      // garde son adresse mais ne reçoit plus rien ; il peut réactiver en la renvoyant
      // depuis ses réglages (ce qui redéclenche un cycle complet de vérification).
      let unsubToken = member.email_verify_token;
      if (!unsubToken) {
        unsubToken = randomUUID();
        await supabaseAdmin.from("members").update({ email_verify_token: unsubToken }).eq("id", member.id);
      }
      const unsubUrl = `${baseUrl}/api/account/email/unsubscribe?token=${unsubToken}`;

      const noveltiesHtml = hasNovelties
        ? `<ul>${novelties
            .map((n) => {
              const title = n.items?.title ?? "Chanson";
              const artist = n.items?.artist_name ? ` — ${n.items.artist_name}` : "";
              const pseudo = n.members?.pseudo ?? "quelqu'un";
              return `<li>${title}${artist} — par ${pseudo}</li>`;
            })
            .join("")}</ul>`
        : "";

      const staleHtml = hasStale
        ? (staleShares ?? [])
            .map(
              (s) =>
                `<p>Ton slot #${s.rank} n'a pas bougé depuis ${daysSince(s.added_at)} jours — remplace-le ?</p>`
            )
            .join("")
        : "";

      const html = `
        <p>Salut ${member.pseudo},</p>
        ${hasNovelties ? `<p>Cette semaine dans ${groupName} :</p>${noveltiesHtml}` : ""}
        ${hasComments ? `<p>💬 ${commentsCount} commentaire${commentsCount > 1 ? "s" : ""} reçu${commentsCount > 1 ? "s" : ""} sur tes partages</p>` : ""}
        ${hasListens ? `<p>🎧 ${listensCount} écoute${listensCount > 1 ? "s" : ""} reçue${listensCount > 1 ? "s" : ""}</p>` : ""}
        ${staleHtml}
        <p><a href="${baseUrl}/g/${groupCode}">Retourner à ${groupName}</a></p>
        <p style="font-size:12px;color:#888;margin-top:24px;">
          <a href="${unsubUrl}">Ne plus recevoir ce résumé</a>
        </p>
      `;

      const ok = await sendEmail({
        to: member.email,
        subject: `Cette semaine dans ${groupName} 🎵`,
        html,
      });

      if (ok) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error("weekly-digest: échec pour un membre", member.id, error);
      failed++;
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
