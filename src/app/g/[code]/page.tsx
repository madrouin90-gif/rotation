"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useGroupData } from "@/hooks/useGroupData";
import { GroupTopBar } from "@/components/group/GroupTopBar";
import { GroupWall } from "@/components/group/GroupWall";
import { MemberFilterBar } from "@/components/group/MemberFilterBar";
import { GenreFilterBar } from "@/components/group/GenreFilterBar";
import { RecentActivitySidebar } from "@/components/group/RecentActivitySidebar";
import { GroupChatPanel } from "@/components/group/GroupChatPanel";
import { SortToggle } from "@/components/group/SortToggle";
import { AddShareFlow } from "@/components/add-share/AddShareFlow";
import { ShareDetailModal } from "@/components/share/ShareDetailModal";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { GroupState, SortMode } from "@/types";

function findShareById(data: GroupState | null, shareId: string | null) {
  if (!data || !shareId) return null;
  const owner = data.members.find((m) => m.shares.some((s) => s.id === shareId));
  const share = owner?.shares.find((s) => s.id === shareId);
  return owner && share ? { share, member: owner } : null;
}

export default function GroupPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const { session, isLoading: sessionLoading, removeSession } = useMemberSession(code);
  const { data, error, isLoading, refresh } = useGroupData(code, session?.token ?? null);
  const { showError } = useToast();

  const [sortModeOverride, setSortModeOverride] = useState<SortMode | null>(null);
  const [showAddShare, setShowAddShare] = useState(false);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [filterMemberIds, setFilterMemberIds] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"activity" | "chat">("activity");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Capture le nombre de nouveautés UNE SEULE FOIS, au premier chargement — les polls
  // suivants remettent `unseenCount` à 0 côté serveur (last_seen_at vient d'être mis à
  // jour), donc sans cette capture la bannière disparaîtrait dès le 2e poll (~7s).
  // Ajustement pendant le rendu plutôt qu'un effect, cf. GroupWall/SlotGrid.
  const [capturedUnseen, setCapturedUnseen] = useState<{ captured: boolean; value: number }>({
    captured: false,
    value: 0,
  });
  if (data && !capturedUnseen.captured) {
    setCapturedUnseen({ captured: true, value: data.me.unseenCount });
  }

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace(`/rejoindre?code=${code}`);
    }
  }, [sessionLoading, session, router, code]);

  const sortMode = sortModeOverride ?? data?.group.settings.default_sort ?? null;
  const me = useMemo(() => data?.members.find((m) => m.id === data.me.memberId), [data]);
  const selectedShare = findShareById(data, selectedShareId);

  if (sessionLoading || (session && isLoading && !data)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted">Chargement du groupe...</p>
      </div>
    );
  }

  if (!session) return null;

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
        <p className="text-red-400">{error}</p>
        <button onClick={refresh} className="text-sm text-accent hover:underline cursor-pointer">
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) return null;

  function toggleMemberFilter(memberId: string) {
    setFilterMemberIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  }

  function toggleGenreFilter(genre: string) {
    setFilterGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  const activeMemberCount = data.members.filter((m) => m.is_active).length;

  const visibleMembers = data.members
    .filter((m) => filterMemberIds.length === 0 || filterMemberIds.includes(m.id))
    .filter(
      (m) => filterGenres.length === 0 || m.shares.some((s) => s.item.genres.some((g) => filterGenres.includes(g)))
    );

  async function handleReorder(orderedShareIds: string[]) {
    try {
      await apiFetch("/api/shares/reorder", {
        method: "PATCH",
        token: session!.token,
        body: { order: orderedShareIds },
      });
      refresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de réordonner tes slots.");
      refresh();
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
      <GroupTopBar
        groupName={data.group.name}
        groupCode={data.group.code}
        members={data.members}
        meMemberId={data.me.memberId}
        isAdmin={data.me.isAdmin}
        hasPassword={data.me.hasPassword}
        pendingRequestsCount={data.me.pendingRequestsCount}
        onAddShare={() => setShowAddShare(true)}
        onLogout={() => {
          removeSession();
          router.push("/");
        }}
      />

      {capturedUnseen.captured && capturedUnseen.value > 0 && !bannerDismissed && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between gap-3 bg-accent/15 border border-accent/30 rounded-xl px-4 py-2.5 text-sm">
            <span>
              ✨ {capturedUnseen.value} nouveauté{capturedUnseen.value > 1 ? "s" : ""} depuis ta dernière visite
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/g/${code}/historique`} className="text-accent hover:underline font-medium">
                Voir
              </Link>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-muted hover:text-foreground transition cursor-pointer"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl w-full mx-auto flex-1 flex gap-6">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4">
            <p className="text-sm text-muted">
              {activeMemberCount} membre{activeMemberCount > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              {data.group.settings.genre_tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGenreFilter((prev) => !prev)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition cursor-pointer ${
                    showGenreFilter || filterGenres.length > 0
                      ? "bg-accent/20 border-accent text-foreground"
                      : "bg-surface-2 border-border text-muted"
                  }`}
                >
                  🎵 Genres{filterGenres.length > 0 ? ` (${filterGenres.length})` : ""}
                </button>
              )}
              {sortMode && <SortToggle value={sortMode} onChange={setSortModeOverride} />}
            </div>
          </div>

          <div className="pt-3">
            <MemberFilterBar
              members={data.members.filter((m) => m.is_active)}
              selectedIds={filterMemberIds}
              onToggle={toggleMemberFilter}
              onReset={() => setFilterMemberIds([])}
            />
          </div>

          {showGenreFilter && (
            <div className="pt-2">
              <GenreFilterBar
                genres={data.group.settings.genre_tags}
                selectedGenres={filterGenres}
                onToggle={toggleGenreFilter}
                onReset={() => setFilterGenres([])}
              />
            </div>
          )}

          {sortMode && (
            <GroupWall
              members={visibleMembers}
              settings={data.group.settings}
              sortMode={sortMode}
              viewerMemberId={data.me.memberId}
              token={session.token}
              onSelectShare={setSelectedShareId}
              onReorder={handleReorder}
              onRated={refresh}
              onAddShare={() => setShowAddShare(true)}
            />
          )}
        </div>

        <aside className="hidden lg:flex flex-col w-72 shrink-0 py-4 pr-4">
          <div className="flex gap-1 mb-3 px-1">
            <button
              type="button"
              onClick={() => setSidebarTab("activity")}
              className={`text-xs px-2.5 py-1.5 rounded-full transition cursor-pointer ${
                sidebarTab === "activity" ? "bg-accent/20 text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              Activité
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("chat")}
              className={`text-xs px-2.5 py-1.5 rounded-full transition cursor-pointer ${
                sidebarTab === "chat" ? "bg-accent/20 text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              Chat
            </button>
          </div>
          {sidebarTab === "activity" ? (
            <RecentActivitySidebar groupCode={data.group.code} token={session.token} />
          ) : (
            <GroupChatPanel
              groupCode={data.group.code}
              token={session.token}
              myMemberId={data.me.memberId}
              isAdmin={data.me.isAdmin}
            />
          )}
        </aside>
      </div>

      {showAddShare && me && (
        <AddShareFlow
          token={session.token}
          settings={data.group.settings}
          myShares={me.shares}
          onClose={() => setShowAddShare(false)}
          onChanged={refresh}
        />
      )}

      {selectedShare && (
        <ShareDetailModal
          share={selectedShare.share}
          member={selectedShare.member}
          settings={data.group.settings}
          token={session.token}
          myMemberId={data.me.memberId}
          isMe={selectedShare.member.id === data.me.memberId}
          isAdmin={data.me.isAdmin}
          onClose={() => setSelectedShareId(null)}
          onChanged={refresh}
          onSaveNote={(note) => handleSaveNote(selectedShare.share.id, note)}
          onSaveGenres={(genres) => handleSaveGenres(selectedShare.share.id, genres)}
        />
      )}
    </div>
  );
}
