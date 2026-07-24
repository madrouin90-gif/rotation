"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { MemberWithShares } from "@/types";

interface AdminBroadcastSectionProps {
  token: string;
  groupCode: string;
  members: Pick<MemberWithShares, "id" | "pseudo" | "is_active">[];
}

const MAX_LENGTH = 300;

export function AdminBroadcastSection({ token, groupCode, members }: AdminBroadcastSectionProps) {
  const { showError, showSuccess } = useToast();
  const [message, setMessage] = useState("");
  const [targetMemberId, setTargetMemberId] = useState<string>("");
  const [sending, setSending] = useState(false);

  const activeMembers = members.filter((m) => m.is_active);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await apiFetch<{ recipientCount: number }>(`/api/groups/${groupCode}/announce`, {
        method: "POST",
        token,
        body: { message: trimmed, targetMemberId: targetMemberId || undefined },
      });
      showSuccess(
        res.recipientCount > 0
          ? `Message envoyé à ${res.recipientCount} membre${res.recipientCount > 1 ? "s" : ""}.`
          : "Message enregistré, mais personne n'a de notifications activées pour le recevoir."
      );
      setMessage("");
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'envoyer ce message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl">Envoyer un message push</h2>
        <p className="text-xs text-muted mt-1">
          Envoie une notification à ta guise, à tout le groupe ou à un membre en particulier. Seuls les membres ayant
          activé les notifications sur leur appareil la reçoivent.
        </p>
      </div>

      <div className="flex flex-col gap-3 max-w-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Destinataire</label>
          <select
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
            disabled={sending}
            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition"
          >
            <option value="">Tout le groupe</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.pseudo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            value={message}
            maxLength={MAX_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Ton message..."
            disabled={sending}
            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition resize-none"
          />
          <p className="text-xs text-muted text-right">
            {message.length}/{MAX_LENGTH}
          </p>
        </div>

        <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()} className="w-fit">
          {sending ? "Envoi..." : "Envoyer"}
        </Button>
      </div>
    </section>
  );
}
