"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { saveSession } from "@/lib/session";

type Step = "code" | "credentials";

export default function ConnexionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const normalizedCode = code.trim().toUpperCase();
      const result = await apiFetch<{ token: string; memberId: string; groupCode: string; groupName: string }>(
        `/api/groups/${normalizedCode}/login`,
        { method: "POST", body: { pseudo, password } }
      );
      saveSession({
        token: result.token,
        memberId: result.memberId,
        groupCode: result.groupCode,
        groupName: result.groupName,
      });
      router.push(`/g/${result.groupCode}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de se connecter. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full animate-fade-in-up">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition">
          ← Retour
        </Link>

        {step === "code" && (
          <div className="mt-6 flex flex-col gap-4">
            <h1 className="font-display text-3xl">Se connecter</h1>
            <p className="text-muted text-sm">Entre le code à 6 caractères du groupe.</p>
            <Input
              autoFocus
              placeholder="EX4B7K"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && code.trim().length === 6 && setStep("credentials")}
              className="text-center tracking-[0.3em] font-display text-xl uppercase"
            />
            <Button size="lg" disabled={code.trim().length !== 6} onClick={() => setStep("credentials")}>
              Continuer
            </Button>
          </div>
        )}

        {step === "credentials" && (
          <div className="mt-6 flex flex-col gap-4">
            <h1 className="font-display text-3xl">Se connecter</h1>
            <p className="text-muted text-sm">Ton pseudo et ton mot de passe dans ce groupe.</p>
            <Input
              autoFocus
              placeholder="Ton pseudo"
              value={pseudo}
              maxLength={24}
              onChange={(e) => setPseudo(e.target.value)}
            />
            <Input
              placeholder="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pseudo.trim() && password && handleLogin()}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("code")} disabled={loading}>
                Retour
              </Button>
              <Button className="flex-1" disabled={!pseudo.trim() || !password || loading} onClick={handleLogin}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
