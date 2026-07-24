"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AccountAuthForm } from "@/components/onboarding/AccountAuthForm";

export default function CompteConnexionPage() {
  return (
    <Suspense fallback={null}>
      <CompteConnexionForm />
    </Suspense>
  );
}

function CompteConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/compte/mes-groupes";

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full animate-fade-in-up">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition">
          ← Retour
        </Link>
        <div className="mt-6 flex flex-col gap-4">
          <h1 className="font-display text-3xl">Se connecter</h1>
          <p className="text-muted text-sm">Avec ton compte Rotation (email + mot de passe).</p>
          <AccountAuthForm initialMode="login" onAuthenticated={() => router.push(next)} />
        </div>
      </div>
    </main>
  );
}
