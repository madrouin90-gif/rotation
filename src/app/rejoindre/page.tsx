"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AvatarPicker } from "@/components/onboarding/AvatarPicker";
import { PublicGroupsList } from "@/components/onboarding/PublicGroupsList";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/avatars";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { saveSession } from "@/lib/session";

type Step = "code" | "choice" | "profile" | "login" | "pending";

export default function RejoindreGroupePage() {
  return (
    <Suspense fallback={null}>
      <RejoindreForm />
    </Suspense>
  );
}

function RejoindreForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === passwordConfirm;

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

  async function handleJoin() {
    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const normalizedCode = code.trim().toUpperCase();
      const result = await apiFetch<{
        token: string;
        memberId: string;
        groupCode: string;
        groupName: string;
        approvalStatus: "pending" | "approved";
      }>(`/api/groups/${normalizedCode}/join`, {
        method: "POST",
        body: { pseudo, avatarEmoji: emoji, avatarColor: color, password },
      });
      saveSession({
        token: result.token,
        memberId: result.memberId,
        groupCode: result.groupCode,
        groupName: result.groupName,
      });
      if (result.approvalStatus === "pending") {
        setStep("pending");
      } else {
        router.push(`/g/${result.groupCode}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de rejoindre ce groupe. Réessaie.");
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
            <h1 className="font-display text-3xl">Rejoindre un groupe</h1>

            <PublicGroupsList
              onSelect={(selectedCode) => {
                setCode(selectedCode);
                setStep("choice");
              }}
            />

            <p className="text-muted text-sm">Entre le code à 6 caractères partagé par un membre du groupe.</p>
            <Input
              autoFocus
              placeholder="EX4B7K"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && code.trim().length === 6 && setStep("choice")}
              className="text-center tracking-[0.3em] font-display text-xl uppercase"
            />
            <Button size="lg" disabled={code.trim().length !== 6} onClick={() => setStep("choice")}>
              Continuer
            </Button>
          </div>
        )}

        {step === "choice" && (
          <div className="mt-6 flex flex-col gap-4">
            <h1 className="font-display text-3xl">Groupe {code}</h1>
            <p className="text-muted text-sm">As-tu déjà un profil dans ce groupe ?</p>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setStep("login")}>
                J&apos;ai déjà un compte
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setStep("profile")}>
                Créer un nouveau profil
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setStep("code")}>
              Retour
            </Button>
          </div>
        )}

        {step === "login" && (
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
              <Button variant="secondary" onClick={() => setStep("choice")} disabled={loading}>
                Retour
              </Button>
              <Button className="flex-1" disabled={!pseudo.trim() || !password || loading} onClick={handleLogin}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="mt-6 flex flex-col gap-5">
            <h1 className="font-display text-3xl">Ton profil</h1>
            <p className="text-muted text-sm">Choisis un pseudo unique dans le groupe et un avatar.</p>
            <Input
              autoFocus
              placeholder="Ton pseudo"
              value={pseudo}
              maxLength={24}
              onChange={(e) => setPseudo(e.target.value)}
            />
            <AvatarPicker
              emoji={emoji}
              color={color}
              onChange={(newEmoji, newColor) => {
                setEmoji(newEmoji);
                setColor(newColor);
              }}
            />
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                placeholder="Confirme le mot de passe"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <p className="text-xs text-muted">
                Te permettra de te reconnecter depuis un autre appareil (8 caractères minimum).
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("choice")} disabled={loading}>
                Retour
              </Button>
              <Button
                className="flex-1"
                disabled={!pseudo.trim() || password.length < 8 || !passwordsMatch || loading}
                onClick={handleJoin}
              >
                {loading ? "Connexion..." : "Rejoindre"}
              </Button>
            </div>
          </div>
        )}

        {step === "pending" && (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <p className="text-4xl">⏳</p>
            <h1 className="font-display text-2xl">Demande envoyée</h1>
            <p className="text-muted text-sm">
              Ce groupe demande l&apos;approbation de l&apos;admin avant de rejoindre. Tu seras en mesure d&apos;accéder
              au groupe dès que ta demande sera acceptée.
            </p>
            <Link href="/" className="text-accent hover:underline text-sm mt-2">
              Retour à l&apos;accueil
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
