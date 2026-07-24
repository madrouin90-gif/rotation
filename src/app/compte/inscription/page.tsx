"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AccountAuthForm } from "@/components/onboarding/AccountAuthForm";

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}

function InscriptionForm() {
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
          <h1 className="font-display text-3xl">Créer un compte</h1>
          <p className="text-muted text-sm">Un seul compte pour tous tes groupes Rotation.</p>
          <AccountAuthForm initialMode="signup" onAuthenticated={() => router.push(next)} />
        </div>
      </div>
    </main>
  );
}
