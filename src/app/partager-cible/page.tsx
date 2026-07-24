"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAllSessions, type MemberSession } from "@/lib/session";

const SPOTIFY_URL_RE = /https?:\/\/open\.spotify\.com\/(?:track|album|artist)\/[A-Za-z0-9]+(?:\?\S*)?/;

function extractSpotifyUrl(...fields: (string | null)[]): string | null {
  for (const field of fields) {
    if (!field) continue;
    const match = field.match(SPOTIFY_URL_RE);
    if (match) return match[0];
  }
  return null;
}

/**
 * Reçoit un partage natif depuis une autre app (ex. "Partager" depuis Spotify → Rotation),
 * via le Web Share Target déclaré dans manifest.ts. Android/Chrome uniquement — iOS/Safari
 * ne supporte pas cette API, les membres iPhone continuent d'utiliser le bouton "Coller".
 */
function ShareTargetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<MemberSession[] | null>(null);

  const spotifyUrl = extractSpotifyUrl(searchParams.get("url"), searchParams.get("text"), searchParams.get("title"));

  useEffect(() => {
    const all = getAllSessions();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(all);
    if (spotifyUrl && all.length === 1) {
      router.replace(`/g/${all[0].groupCode}?shareUrl=${encodeURIComponent(spotifyUrl)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!spotifyUrl) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-3">
        <p className="text-muted">Aucun lien Spotify reconnu dans ce partage.</p>
        <Link href="/" className="text-accent hover:underline text-sm">
          ← Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  if (sessions === null) return null;

  if (sessions.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-3">
        <p className="text-muted">Rejoins d&apos;abord un groupe pour pouvoir y partager une chanson.</p>
        <Link href="/rejoindre" className="text-accent hover:underline text-sm">
          Rejoindre un groupe →
        </Link>
      </main>
    );
  }

  if (sessions.length === 1) return null;

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-16">
      <div className="max-w-sm w-full flex flex-col gap-4 animate-fade-in-up">
        <h1 className="font-display text-2xl text-center">Partager dans quel groupe ?</h1>
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Link
              key={s.groupCode}
              href={`/g/${s.groupCode}?shareUrl=${encodeURIComponent(spotifyUrl)}`}
              className="bg-surface-2 hover:bg-surface-2/70 rounded-xl px-4 py-3 text-sm transition"
            >
              {s.groupName}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={null}>
      <ShareTargetContent />
    </Suspense>
  );
}
