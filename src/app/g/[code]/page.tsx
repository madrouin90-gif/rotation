"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useGroupData } from "@/hooks/useGroupData";
import { GroupTopBar } from "@/components/group/GroupTopBar";
import { GroupWall } from "@/components/group/GroupWall";
import { RecentActivitySidebar } from "@/components/group/RecentActivitySidebar";
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
  const { session, isLoading: sessionLoading } = useMemberSession(code);
  const { data, error, isLoading, refresh } = useGroupData(code, session?.token ?? null);
  const { showError } = useToast();

  const [sortModeOverride, setSortModeOverride] = useState<SortMode | null>(null);
  const [showAddShare, setShowAddShare] = useState(false);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);

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

  return (
    <div className="flex-1 flex flex-col">
      <GroupTopBar
        groupName={data.group.name}
        groupCode={data.group.code}
        members={data.members}
        meMemberId={data.me.memberId}
        isAdmin={data.me.isAdmin}
        onAddShare={() => setShowAddShare(true)}
      />

      <div className="max-w-7xl w-full mx-auto flex-1 flex gap-6">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4">
            <p className="text-sm text-muted">
              {data.members.length} membre{data.members.length > 1 ? "s" : ""}
            </p>
            {sortMode && <SortToggle value={sortMode} onChange={setSortModeOverride} />}
          </div>

          {sortMode && (
            <GroupWall
              members={data.members}
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

        <aside className="hidden lg:block w-72 shrink-0 py-4 pr-4">
          <RecentActivitySidebar groupCode={data.group.code} token={session.token} />
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
          isMe={selectedShare.member.id === data.me.memberId}
          onClose={() => setSelectedShareId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
