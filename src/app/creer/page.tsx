"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { AvatarPicker } from "@/components/onboarding/AvatarPicker";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/avatars";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { saveSession } from "@/lib/session";

type Step = "name" | "profile";

export default function CreerGroupePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [groupName, setGroupName] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === passwordConfirm;

  async function handleCreate() {
    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ token: string; memberId: string; groupCode: string; groupName: string }>(
        "/api/groups",
        {
          method: "POST",
          body: { groupName, pseudo, avatarEmoji: emoji, avatarColor: color, password, isPublic, requireApproval },
        }
      );
      saveSession({
        token: result.token,
        memberId: result.memberId,
        groupCode: result.groupCode,
        groupName: result.groupName,
      });
      router.push(`/g/${result.groupCode}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer le groupe. Réessaie.");
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

        {step === "name" && (
          <div className="mt-6 flex flex-col gap-4">
            <h1 className="font-display text-3xl">Créer un groupe</h1>
            <p className="text-muted text-sm">Donne un nom à ton groupe. Tu pourras le changer plus tard.</p>
            <Input
              autoFocus
              placeholder="Ex. Les oreilles d'or"
              value={groupName}
              maxLength={60}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && groupName.trim() && setStep("profile")}
            />

            <div className="flex flex-col gap-3 bg-surface-2 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Groupe public</p>
                  <p className="text-xs text-muted">Listé dans l&apos;annuaire pour que d&apos;autres puissent le trouver.</p>
                </div>
                <Toggle checked={isPublic} onChange={setIsPublic} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Approbation requise</p>
                  <p className="text-xs text-muted">Les nouvelles demandes restent en attente jusqu&apos;à ton accord.</p>
                </div>
                <Toggle checked={requireApproval} onChange={setRequireApproval} />
              </div>
              <p className="text-xs text-muted">Modifiable à tout moment dans les réglages du groupe.</p>
            </div>

            <Button
              size="lg"
              disabled={!groupName.trim()}
              onClick={() => setStep("profile")}
            >
              Continuer
            </Button>
          </div>
        )}

        {step === "profile" && (
          <div className="mt-6 flex flex-col gap-5">
            <h1 className="font-display text-3xl">Ton profil</h1>
            <p className="text-muted text-sm">Choisis un pseudo et un avatar. Tu seras l&apos;admin de ce groupe.</p>
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
              <Button variant="secondary" onClick={() => setStep("name")} disabled={loading}>
                Retour
              </Button>
              <Button
                className="flex-1"
                disabled={!pseudo.trim() || password.length < 8 || !passwordsMatch || loading}
                onClick={handleCreate}
              >
                {loading ? "Création..." : "Créer le groupe"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
