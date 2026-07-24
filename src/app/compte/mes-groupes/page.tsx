"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getUserSession, saveSession, clearUserSession } from "@/lib/session";

interface MeResponse {
  email: string;
  emailVerified: boolean;
  groups: { groupCode: string; groupName: string; memberId: string; pseudo: string }[];
}

export default function MesGroupesPage() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCode, setOpeningCode] = useState<string | null>(null);

  const userSession = getUserSession();

  useEffect(() => {
    if (!userSession) {
      router.replace("/compte/connexion?next=/compte/mes-groupes");
      return;
    }
    apiFetch<MeResponse>("/api/auth/me", { userToken: userSession.token })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger tes groupes."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openGroup(groupCode: string) {
    if (!userSession) return;
    setOpeningCode(groupCode);
    try {
      const result = await apiFetch<{ token: string; memberId: string; groupCode: string; groupName: string }>(
        "/api/auth/select-group",
        { method: "POST", userToken: userSession.token, body: { groupCode } }
      );
      saveSession(result);
      router.push(`/g/${result.groupCode}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible d'ouvrir ce groupe.");
      setOpeningCode(null);
    }
  }

  function handleLogout() {
    clearUserSession();
    router.push("/");
  }

  if (!userSession) return null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full animate-fade-in-up flex flex-col gap-5">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition">
          ← Retour
        </Link>
        <div>
          <h1 className="font-display text-3xl">Mes groupes</h1>
          <p className="text-muted text-sm mt-1">Connecté avec {userSession.email}</p>
        </div>

        {loading && <p className="text-sm text-muted">Chargement...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {data && data.groups.length === 0 && (
          <p className="text-sm text-muted">Tu n&apos;as encore aucun groupe lié à ce compte.</p>
        )}

        {data && data.groups.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.groups.map((g) => (
              <button
                key={g.groupCode}
                onClick={() => openGroup(g.groupCode)}
                disabled={openingCode !== null}
                className="flex items-center justify-between bg-surface-2 hover:bg-surface-3 rounded-xl p-4 text-left transition cursor-pointer disabled:opacity-60"
              >
                <div>
                  <p className="font-medium">{g.groupName}</p>
                  <p className="text-xs text-muted">{g.pseudo}</p>
                </div>
                <span className="text-muted">{openingCode === g.groupCode ? "..." : "→"}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/rejoindre" className="flex-1">
            <Button variant="secondary" className="w-full">
              Rejoindre un groupe
            </Button>
          </Link>
          <Link href="/creer" className="flex-1">
            <Button className="w-full">Créer un groupe</Button>
          </Link>
        </div>

        <button onClick={handleLogout} className="text-xs text-muted hover:text-foreground transition cursor-pointer text-left">
          Se déconnecter de ce compte
        </button>
      </div>
    </main>
  );
}
