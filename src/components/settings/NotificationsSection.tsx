"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { NotificationEventType } from "@/types";

interface NotificationsSectionProps {
  token: string;
  groupCode: string;
  notificationEvents: NotificationEventType[];
  onRefresh: () => void;
}

const EVENT_LABELS: { type: NotificationEventType; label: string; description: string }[] = [
  {
    type: "share_activity",
    label: "Nouveau partage ou remplacement",
    description: "« {pseudo} a partagé/remplacé un partage »",
  },
  {
    type: "chat_activity",
    label: "Commentaire ou message de chat",
    description: "Un commentaire sur une chanson ou un message dans le chat du groupe.",
  },
  {
    type: "reaction_added",
    label: "Réaction reçue",
    description: "Quelqu'un réagit à l'un de tes partages.",
  },
  {
    type: "join_requested",
    label: "Nouvelle demande d'adhésion",
    description: "Admins seulement — une demande attend une approbation.",
  },
];

export function NotificationsSection({ token, groupCode, notificationEvents, onRefresh }: NotificationsSectionProps) {
  const { showError } = useToast();
  const [saving, setSaving] = useState<NotificationEventType | null>(null);

  async function toggle(type: NotificationEventType, enabled: boolean) {
    setSaving(type);
    const next = enabled
      ? [...notificationEvents, type]
      : notificationEvents.filter((e) => e !== type);
    try {
      await apiFetch(`/api/groups/${groupCode}`, {
        method: "PATCH",
        token,
        body: { action: "update_settings", patch: { notification_events: next } },
      });
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de mettre à jour les notifications.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl">Notifications push</h2>
        <p className="text-xs text-muted mt-1">
          Choisis quels événements envoient une notification aux membres ayant activé les notifications sur leur
          appareil (dans leur profil). Personne n&apos;est notifié de ses propres actions.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {EVENT_LABELS.map(({ type, label, description }) => (
          <div key={type} className="flex items-start justify-between gap-4">
            <div className="max-w-xs">
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted mt-0.5">{description}</p>
            </div>
            <Toggle
              checked={notificationEvents.includes(type)}
              onChange={(v) => toggle(type, v)}
              disabled={saving === type}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
