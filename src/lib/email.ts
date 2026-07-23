import "server-only";
import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoie un courriel via Resend. Ne throw jamais : retourne `false` et logge en cas
 * d'échec (envoi de courriel = fonctionnalité secondaire, jamais bloquante). Sans
 * RESEND_API_KEY (dev local sans compte Resend), no-op qui retourne `false`.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn("sendEmail: RESEND_API_KEY ou EMAIL_FROM absent, courriel non envoyé (no-op).", { to, subject });
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("sendEmail failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("sendEmail threw", error);
    return false;
  }
}
