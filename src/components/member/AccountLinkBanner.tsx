"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { saveUserSession } from "@/lib/session";

interface AccountLinkBannerProps {
  token: string;
  email: string | null;
  emailVerified: boolean;
  hasLinkedAccount: boolean;
  onLinked: () => void;
}

type Stage = "no-email" | "unverified" | "verified";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STAGE_MESSAGES: Record<Stage, string> = {
  "no-email":
    "🔗 Ajoute un email pour sécuriser l'accès à ce profil et pouvoir le lier à un compte (utile si tu perds ta session).",
  unverified: "📬 Vérifie ton courriel pour pouvoir lier ce profil à un compte.",
  verified: "🔗 Lie ce profil à un compte pour te connecter avec ton email et rejoindre d'autres groupes facilement ?",
};

/**
 * Propose à tout membre non lié à un compte de sécuriser son accès — en 3 étapes selon
 * son état : ajouter un email, le vérifier, puis lier le profil. Réapparaît à chaque
 * visite tant que le profil n'est pas lié (pas de mémorisation de "plus tard" au-delà de
 * la session en cours). Sans email/compte, un membre qui perd sa session locale n'a
 * aucun moyen de récupérer l'accès (pas de "mot de passe oublié" pour les profils non
 * liés) — cette bannière est la façon de s'en prémunir à l'avance.
 */
export function AccountLinkBanner({ token, email, emailVerified, hasLinkedAccount, onLinked }: AccountLinkBannerProps) {
  const { showError, showSuccess } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  if (dismissed || hasLinkedAccount) return null;

  const stage: Stage = !email ? "no-email" : !emailVerified ? "unverified" : "verified";

  async function handleAddEmail() {
    if (!EMAIL_RE.test(newEmail.trim())) {
      showError("Adresse courriel invalide.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch<{ ok: true; verificationSent: boolean }>("/api/account/email", {
        method: "POST",
        token,
        body: { email: newEmail.trim() },
      });
      showSuccess("Courriel de vérification envoyé.");
      onLinked();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer ce courriel.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setSaving(true);
    try {
      await apiFetch<{ ok: true; verificationSent: boolean }>("/api/account/email", {
        method: "POST",
        token,
        body: { email },
      });
      showSuccess("Courriel de vérification renvoyé.");
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de renvoyer le courriel.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLink() {
    if (password !== confirm) {
      showError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      showError("Ton mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ token: string; userId: string; email: string }>("/api/account/link", {
        method: "POST",
        token,
        body: { password },
      });
      saveUserSession(result);
      showSuccess("Compte créé et profil lié !");
      onLinked();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de lier ce profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
      <div className="flex flex-col gap-3 bg-accent/15 border border-accent/30 rounded-xl px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span>{STAGE_MESSAGES[stage]}</span>
          <div className="flex items-center gap-3 shrink-0">
            {stage === "unverified" ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={saving}
                className="text-accent font-medium hover:underline cursor-pointer disabled:opacity-50"
              >
                {saving ? "..." : "Renvoyer"}
              </button>
            ) : (
              !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-accent font-medium hover:underline cursor-pointer"
                >
                  {stage === "no-email" ? "Ajouter" : "Lier"}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-muted hover:text-foreground transition cursor-pointer"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {expanded && stage === "no-email" && (
          <div className="flex flex-col gap-2 bg-surface-2 rounded-xl p-3">
            <Input
              autoFocus
              type="email"
              placeholder="Ton courriel"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
              className="py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddEmail}
                disabled={saving}
                className="text-accent font-medium hover:underline cursor-pointer disabled:opacity-50 text-sm"
              >
                {saving ? "..." : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                disabled={saving}
                className="text-muted hover:text-foreground transition cursor-pointer text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {expanded && stage === "verified" && (
          <div className="flex flex-col gap-2 bg-surface-2 rounded-xl p-3">
            <Input
              autoFocus
              type="password"
              placeholder="Choisis un mot de passe pour ton compte"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="py-1.5 text-sm"
            />
            <Input
              type="password"
              placeholder="Confirme le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
              className="py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLink}
                disabled={saving}
                className="text-accent font-medium hover:underline cursor-pointer disabled:opacity-50 text-sm"
              >
                {saving ? "..." : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                disabled={saving}
                className="text-muted hover:text-foreground transition cursor-pointer text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
