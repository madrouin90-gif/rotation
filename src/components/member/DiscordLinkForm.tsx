"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface DiscordLinkFormProps {
  token: string;
  discordUsername: string | null;
  onSaved: () => void;
}

export function DiscordLinkForm({ token, discordUsername, onSaved }: DiscordLinkFormProps) {
  const { showError, showSuccess } = useToast();
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  async function handleLink() {
    setLinking(true);
    try {
      const res = await apiFetch<{ redirectUrl: string }>("/api/account/discord/link", {
        method: "POST",
        token,
      });
      window.location.href = res.redirectUrl;
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de démarrer la liaison avec Discord.");
      setLinking(false);
    }
  }

  async function handleUnlink() {
    setUnlinking(true);
    try {
      await apiFetch("/api/account/discord/unlink", { method: "POST", token });
      showSuccess("Compte Discord délié.");
      onSaved();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de délier ton compte Discord.");
    } finally {
      setUnlinking(false);
    }
  }

  if (discordUsername) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted">
          Discord lié : <span className="text-foreground">{discordUsername}</span>
        </p>
        <button
          type="button"
          onClick={handleUnlink}
          disabled={unlinking}
          className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-fit disabled:opacity-50"
        >
          {unlinking ? "..." : "Délier mon compte Discord"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted">
        Lie ton compte Discord pour que tes partages postés dans le salon du groupe soient ajoutés automatiquement.
      </p>
      <Button size="sm" variant="secondary" onClick={handleLink} disabled={linking} className="w-fit">
        {linking ? "..." : "Lier mon compte Discord"}
      </Button>
    </div>
  );
}
