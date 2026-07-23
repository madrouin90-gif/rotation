"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function AdminSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ needsSetup: boolean }>("/api/admin/setup")
      .then((res) => {
        setNeedsSetup(res.needsSetup);
        if (!res.needsSetup) router.replace("/admin/login");
      })
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit() {
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/admin/setup", { method: "POST", body: { email, password } });
      router.push("/admin");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de créer le compte super-admin.");
    } finally {
      setLoading(false);
    }
  }

  if (checking || !needsSetup) return null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full flex flex-col gap-4">
        <h1 className="font-display text-3xl">Configuration super-admin</h1>
        <p className="text-muted text-sm">
          Aucun compte super-admin n&apos;existe encore. Ce formulaire ne fonctionnera qu&apos;une seule fois.
        </p>
        <Input placeholder="Courriel" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          placeholder="Mot de passe (8 caractères min.)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          placeholder="Confirme le mot de passe"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button size="lg" disabled={!email || password.length < 8 || loading} onClick={handleSubmit}>
          {loading ? "Création..." : "Créer le compte super-admin"}
        </Button>
      </div>
    </main>
  );
}
