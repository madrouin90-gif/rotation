"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface DiscordSectionProps {
  token: string;
  groupCode: string;
  discordGuildId: string | null;
  discordChannelId: string | null;
  onRefresh: () => void;
}

const BOT_PERMISSIONS = "68608"; // Voir les salons + Envoyer des messages + Lire l'historique + Ajouter des réactions

export function DiscordSection({
  token,
  groupCode,
  discordGuildId,
  discordChannelId,
  onRefresh,
}: DiscordSectionProps) {
  const { showError, showSuccess } = useToast();
  const [guildId, setGuildId] = useState(discordGuildId ?? "");
  const [channelId, setChannelId] = useState(discordChannelId ?? "");
  const [saving, setSaving] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const inviteUrl = clientId
    ? `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=${BOT_PERMISSIONS}`
    : null;

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/groups/${groupCode}`, {
        method: "PATCH",
        token,
        body: {
          action: "update_discord",
          discordGuildId: guildId.trim() || null,
          discordChannelId: channelId.trim() || null,
        },
      });
      showSuccess("Configuration Discord enregistrée.");
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer la configuration Discord.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl">Discord</h2>
        <p className="text-xs text-muted mt-1">
          Relie ce groupe à un salon Discord : les membres qui lient leur compte (dans leur profil) voient
          automatiquement leurs liens Spotify postés dans ce salon ajoutés à leur profil Rotation.
        </p>
      </div>

      {inviteUrl && (
        <a href={inviteUrl} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline w-fit">
          1. Inviter le bot Rotation sur ton serveur →
        </a>
      )}

      <p className="text-xs text-muted">
        2. Active le mode développeur dans Discord (Réglages → Avancé), puis clic droit sur ton serveur et le salon
        visé pour copier leurs identifiants ci-dessous.
      </p>

      <div className="flex flex-col gap-3 max-w-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">ID du serveur Discord</label>
          <Input value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="123456789012345678" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">ID du salon Discord</label>
          <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="123456789012345678" />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </section>
  );
}
