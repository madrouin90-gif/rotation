import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";
import { sendEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SetEmailBody {
  email?: string | null;
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "email", 5, 60 * 60);

    const member = await requireMember(request);
    const body = (await request.json()) as SetEmailBody;
    const rawEmail = body.email?.trim().toLowerCase() ?? "";

    if (!rawEmail) {
      const { error } = await supabaseAdmin
        .from("members")
        .update({ email: null, email_verified_at: null, email_verify_token: null })
        .eq("id", member.id);

      if (error) throw new AppError("Impossible de retirer ton courriel.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "email_updated",
        metadata: { hasEmail: false },
      });

      return NextResponse.json({ ok: true, verificationSent: false });
    }

    if (!EMAIL_RE.test(rawEmail)) {
      throw new AppError("Adresse courriel invalide.");
    }

    const verifyToken = randomUUID();

    const { error } = await supabaseAdmin
      .from("members")
      .update({ email: rawEmail, email_verified_at: null, email_verify_token: verifyToken })
      .eq("id", member.id);

    if (error) throw new AppError("Impossible d'enregistrer ton courriel.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "email_updated",
      metadata: { hasEmail: true },
    });

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/account/email/verify?token=${verifyToken}`;

    const verificationSent = await sendEmail({
      to: rawEmail,
      subject: "Confirme ton courriel — Rotation",
      html: `
        <p>Salut ${member.pseudo},</p>
        <p>Clique sur le lien ci-dessous pour confirmer ton adresse courriel sur Rotation :</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore ce courriel.</p>
      `,
    });

    return NextResponse.json({ ok: true, verificationSent });
  } catch (error) {
    return errorResponse(error);
  }
}
