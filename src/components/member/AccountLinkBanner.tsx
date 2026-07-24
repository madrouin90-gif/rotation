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

/**
 * Propose aux membres existants (ayant déjà un email vérifié, mais créés avant
 * l'introduction des comptes) de lier leur profil à un compte — leur permet de se
 * connecter avec leur email et, éventuellement, de rejoindre d'autres groupes sans
 * redéfinir de mot de passe. Réapparaît à chaque visite tant que le profil n'est pas
 * lié (pas de mémorisation de "plus tard" au-delà de la session en cours).
 */
export function AccountLinkBanner({ token, email, emailVerified, hasLinkedAccount, onLinked }: AccountLinkBannerProps) {
  const { showError, showSuccess } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  if (dismissed || hasLinkedAccount || !email || !emailVerified) return null;

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
          <span>🔗 Lie ce profil à un compte pour te connecter avec ton email et rejoindre d&apos;autres groupes facilement ?</span>
          <div className="flex items-center gap-3 shrink-0">
            {!expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-accent font-medium hover:underline cursor-pointer"
              >
                Lier
              </button>
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

        {expanded && (
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
