"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense fallback={null}>
      <ReinitialiserMotDePasseForm />
    </Suspense>
  );
}

function ReinitialiserMotDePasseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirm;

  async function handleSubmit() {
    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, password } });
      router.push("/compte/connexion?passwordReset=1");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de réinitialiser le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-sm w-full animate-fade-in-up flex flex-col gap-4">
          <h1 className="font-display text-3xl">Lien invalide</h1>
          <p className="text-muted text-sm">Ce lien de réinitialisation est invalide ou incomplet.</p>
          <Link href="/compte/mot-de-passe-oublie" className="text-accent hover:underline text-sm">
            Redemander un lien
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full animate-fade-in-up">
        <div className="mt-6 flex flex-col gap-4">
          <h1 className="font-display text-3xl">Nouveau mot de passe</h1>
          <Input
            autoFocus
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirme le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <p className="text-xs text-muted">8 caractères minimum. Tu devras te reconnecter partout ensuite.</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button disabled={password.length < 8 || !passwordsMatch || loading} onClick={handleSubmit}>
            {loading ? "..." : "Réinitialiser le mot de passe"}
          </Button>
        </div>
      </div>
    </main>
  );
}
