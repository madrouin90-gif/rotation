import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/server";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Envoie une notification push à tous les abonnements des membres donnés. Ne throw jamais
 * (fonctionnalité secondaire, jamais bloquante — même philosophie que sendEmail). Sans clés
 * VAPID configurées, no-op silencieux (dev local sans compte push).
 */
export async function sendPushToMembers(memberIds: string[], payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return;
  if (memberIds.length === 0) return;

  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("member_id", memberIds);

  if (error || !subscriptions || subscriptions.length === 0) return;

  const json = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement expiré ou révoqué côté navigateur — on le retire silencieusement.
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("sendPushToMembers: envoi échoué", err);
        }
      }
    })
  );
}
