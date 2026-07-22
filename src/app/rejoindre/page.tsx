"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AvatarPicker } from "@/components/onboarding/AvatarPicker";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/avatars";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { saveSession } from "@/lib/session";

type Step = "code" | "profile";

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
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setError(null);
    setLoading(true);
    try {
      const normalizedCode = code.trim().toUpperCase();
      const result = await apiFetch<{ token: string; memberId: string; groupCode: string; groupName: string }>(
        `/api/groups/${normalizedCode}/join`,
        { method: "POST", body: { pseudo, avatarEmoji: emoji, avatarColor: color } }
      );
      saveSession({
        token: result.token,
        memberId: result.memberId,
        groupCode: result.groupCode,
        groupName: result.groupName,
      });
      router.push(`/g/${result.groupCode}`);
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
            <p className="text-muted text-sm">Entre le code à 6 caractères partagé par un membre du groupe.</p>
            <Input
              autoFocus
              placeholder="EX4B7K"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && code.trim().length === 6 && setStep("profile")}
              className="text-center tracking-[0.3em] font-display text-xl uppercase"
            />
            <Button size="lg" disabled={code.trim().length !== 6} onClick={() => setStep("profile")}>
              Continuer
            </Button>
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("code")} disabled={loading}>
                Retour
              </Button>
              <Button className="flex-1" disabled={!pseudo.trim() || loading} onClick={handleJoin}>
                {loading ? "Connexion..." : "Rejoindre"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
