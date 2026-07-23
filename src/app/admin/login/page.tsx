"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/admin/login", { method: "POST", body: { email, password } });
      router.push("/admin");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full flex flex-col gap-4">
        <h1 className="font-display text-3xl">Super-admin</h1>
        <Input
          autoFocus
          placeholder="Courriel"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Input
          placeholder="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button size="lg" disabled={!email || !password || loading} onClick={handleSubmit}>
          {loading ? "Connexion..." : "Se connecter"}
        </Button>
      </div>
    </main>
  );
}
