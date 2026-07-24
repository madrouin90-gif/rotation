"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/apiClient";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email: email.trim() } });
    } catch {
      // Ignoré volontairement : la réponse est toujours générique, succès ou non.
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full animate-fade-in-up">
        <Link href="/compte/connexion" className="text-sm text-muted hover:text-foreground transition">
          ← Retour
        </Link>

        <div className="mt-6 flex flex-col gap-4">
          <h1 className="font-display text-3xl">Mot de passe oublié</h1>

          {sent ? (
            <p className="text-muted text-sm">
              Si un compte existe avec cette adresse, un lien de réinitialisation vient d&apos;être envoyé — valide 1
              heure.
            </p>
          ) : (
            <>
              <p className="text-muted text-sm">Entre l&apos;email de ton compte Rotation.</p>
              <Input
                autoFocus
                type="email"
                placeholder="Ton courriel"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email.trim() && handleSubmit()}
              />
              <Button disabled={!email.trim() || loading} onClick={handleSubmit}>
                {loading ? "..." : "Envoyer le lien"}
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
