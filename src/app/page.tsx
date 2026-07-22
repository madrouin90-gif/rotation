"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLastGroupCode, getSession } from "@/lib/session";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const [lastGroup, setLastGroup] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    const code = getLastGroupCode();
    if (!code) return;
    const session = getSession(code);
    // Lecture d'un système externe (localStorage) au montage — pas de valeur dérivée d'un prop/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) setLastGroup({ code, name: session.groupName });
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md w-full flex flex-col items-center gap-3 animate-fade-in-up">
        <h1 className="font-display text-6xl tracking-tight">Rotation</h1>
        <p className="text-muted text-lg">
          Le partage musical entre amis. Pas de scroll infini — juste 5 morceaux qui comptent, par personne.
        </p>

        <div className="w-full flex flex-col gap-3 mt-8">
          <Link href="/creer" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              Créer un groupe
            </Button>
          </Link>
          <Link href="/rejoindre" className="w-full">
            <Button variant="secondary" size="lg" className="w-full">
              Rejoindre un groupe
            </Button>
          </Link>
        </div>

        {lastGroup && (
          <Link href={`/g/${lastGroup.code}`} className="mt-6 text-sm text-muted hover:text-foreground transition">
            Retourner à <span className="text-accent">{lastGroup.name}</span> →
          </Link>
        )}
      </div>
    </main>
  );
}
