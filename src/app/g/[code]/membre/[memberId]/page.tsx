"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useGroupData } from "@/hooks/useGroupData";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SlotGrid } from "@/components/member/SlotGrid";
import { PasswordForm } from "@/components/member/PasswordForm";
import { PseudoForm } from "@/components/member/PseudoForm";
import { EmailForm } from "@/components/member/EmailForm";
import { DiscordLinkForm } from "@/components/member/DiscordLinkForm";
import { PushNotificationSetup } from "@/components/push/PushNotificationSetup";
import { AddShareFlow } from "@/components/add-share/AddShareFlow";
import { ShareDetailModal } from "@/components/share/ShareDetailModal";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function MemberPage() {
  const params = useParams<{ code: string; memberId: string }>();
  const code = (params.code ?? "").toUpperCase();
  const memberId = params.memberId ?? "";
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useMemberSession(code);
  const { data, error, isLoading, refresh } = useGroupData(code, session?.token ?? null);
  const { showError, showSuccess } = useToast();

  const [addShareOpen, setAddShareOpen] = useState(false);
  const [replaceRank, setReplaceRank] = useState<number | undefined>(undefined);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);

  const member = useMemo(() => data?.members.find((m) => m.id === memberId), [data, memberId]);
  const isMe = data?.me.memberId === memberId;

  if (sessionLoading) return null;
  if (!session) {
    router.replace(`/rejoindre?code=${code}`);
    return null;
  }
  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <p className="text-red-400">{error ?? "Impossible de charger ce groupe."}</p>
      </div>
    );
  }
  if (!member) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <p className="text-muted">Ce membre n&apos;existe plus dans ce groupe.</p>
        <Link href={`/g/${code}`} className="text-accent hover:underline">
          Retour au groupe
        </Link>
      </div>
    );
  }
  if (!member.is_active) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
        <p className="text-muted">Ce membre a été désactivé par l&apos;admin de ce groupe.</p>
        <Link href={`/g/${code}`} className="text-accent hover:underline">
          Retour au groupe
        </Link>
      </div>
    );
  }

  const selectedShare = selectedShareId ? member.shares.find((s) => s.id === selectedShareId) : null;

  async function handleReorder(orderedIds: string[]) {
    try {
      await apiFetch("/api/shares/reorder", { method: "PATCH", token: session!.token, body: { order: orderedIds } });
      refresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de réordonner tes slots.");
      refresh();
    }
  }

  async function handleRemove(shareId: string) {
    try {
      await apiFetch(`/api/shares/${shareId}`, { method: "DELETE", token: session!.token });
      showSuccess("Partage retiré.");
      refresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de retirer ce partage.");
    }
  }

  async function handleSaveNote(shareId: string, note: string) {
    try {
      await apiFetch(`/api/shares/${shareId}`, { method: "PATCH", token: session!.token, body: { note } });
      refresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer la note.");
    }
  }

  async function handleSaveGenres(shareId: string, genres: string[]) {
    try {
      await apiFetch(`/api/shares/${shareId}`, { method: "PATCH", token: session!.token, body: { genres } });
      refresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer les genres.");
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-4xl mx-auto">
          <Link href={`/g/${code}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" />
          <h1 className="font-display text-xl truncate">{member.pseudo}</h1>
          {isMe && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Toi</span>}
        </div>
      </header>

      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {member.shares.length}/{data.group.settings.slots_per_member} slots utilisés
          </p>
          <Link href={`/g/${code}/membre/${memberId}/archive`} className="text-sm text-accent hover:underline">
            Voir l&apos;archive →
          </Link>
        </div>

        {isMe && (
          <div className="flex flex-col gap-2">
            <PseudoForm token={session.token} currentPseudo={member.pseudo} onSaved={refresh} />
            <PasswordForm token={session.token} hasPassword={data.me.hasPassword} onSaved={refresh} />
            <EmailForm
              token={session.token}
              currentEmail={data.me.email}
              emailVerified={data.me.emailVerified}
              onSaved={refresh}
            />
            <DiscordLinkForm token={session.token} discordUsername={data.me.discordUsername} onSaved={refresh} />
            <PushNotificationSetup token={session.token} />
          </div>
        )}

        <SlotGrid
          shares={member.shares}
          slotsPerMember={data.group.settings.slots_per_member}
          settings={data.group.settings}
          isMe={Boolean(isMe)}
          onReorder={handleReorder}
          onOpenDetail={setSelectedShareId}
          onRemove={handleRemove}
          onSaveNote={handleSaveNote}
          onSaveGenres={handleSaveGenres}
          onReplace={(rank) => {
            setReplaceRank(rank);
            setAddShareOpen(true);
          }}
          onAddEmpty={() => {
            setReplaceRank(undefined);
            setAddShareOpen(true);
          }}
        />

        {isMe && member.shares.length === 0 && (
          <div className="mt-6">
            <Button onClick={() => setAddShareOpen(true)}>+ Ajouter ton premier partage</Button>
          </div>
        )}
      </div>

      {addShareOpen && (
        <AddShareFlow
          token={session.token}
          settings={data.group.settings}
          myShares={member.shares}
          forcedReplaceRank={replaceRank}
          onClose={() => setAddShareOpen(false)}
          onChanged={refresh}
        />
      )}

      {selectedShare && (
        <ShareDetailModal
          share={selectedShare}
          member={member}
          settings={data.group.settings}
          token={session.token}
          myMemberId={data.me.memberId}
          isMe={Boolean(isMe)}
          isAdmin={data.me.isAdmin}
          onClose={() => setSelectedShareId(null)}
          onChanged={refresh}
          onSaveNote={(note) => handleSaveNote(selectedShare.id, note)}
          onSaveGenres={(genres) => handleSaveGenres(selectedShare.id, genres)}
        />
      )}
    </div>
  );
}
