"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { saveUserSession, type UserSession } from "@/lib/session";

interface AccountAuthFormProps {
  initialMode?: "signup" | "login";
  onAuthenticated: (session: UserSession) => void;
}

/**
 * Créer un compte ou se connecter (email + mot de passe) — identifiant global du
 * compte, distinct du pseudo propre à chaque groupe. Utilisé aussi bien en page
 * autonome (/compte/inscription, /compte/connexion) qu'embarqué dans les étapes de
 * création/adhésion à un groupe (un compte est désormais requis pour ça).
 */
export function AccountAuthForm({ initialMode = "signup", onAuthenticated }: AccountAuthFormProps) {
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = mode === "login" || password === confirm;

  async function handleSubmit() {
    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const result = await apiFetch<{ token: string; userId: string; email: string }>(path, {
        method: "POST",
        body: { email: email.trim(), password },
      });
      saveUserSession(result);
      onAuthenticated(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de continuer. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-surface-2 rounded-xl p-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`cursor-pointer transition ${mode === "signup" ? "font-medium text-accent" : "text-muted hover:text-foreground"}`}
        >
          Créer un compte
        </button>
        <span className="text-muted">·</span>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`cursor-pointer transition ${mode === "login" ? "font-medium text-accent" : "text-muted hover:text-foreground"}`}
        >
          J&apos;ai déjà un compte
        </button>
      </div>
      <Input
        autoFocus
        type="email"
        placeholder="Ton courriel"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === "signup" && (
        <Input
          type="password"
          placeholder="Confirme le mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      )}
      {mode === "signup" && <p className="text-xs text-muted">8 caractères minimum.</p>}
      {mode === "login" && (
        <Link href="/compte/mot-de-passe-oublie" className="text-xs text-muted hover:text-foreground transition w-fit">
          Mot de passe oublié ?
        </Link>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        onClick={handleSubmit}
        disabled={loading || !email.trim() || password.length < 8 || (mode === "signup" && !passwordsMatch)}
      >
        {loading ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
      </Button>
    </div>
  );
}
