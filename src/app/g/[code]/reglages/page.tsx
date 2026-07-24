"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useGroupData } from "@/hooks/useGroupData";
import { IdentitySection } from "@/components/settings/IdentitySection";
import { JoinRequestsSection } from "@/components/settings/JoinRequestsSection";
import { MembersSection } from "@/components/settings/MembersSection";
import { ParamsSection } from "@/components/settings/ParamsSection";
import { DiscordSection } from "@/components/settings/DiscordSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { AdminBroadcastSection } from "@/components/settings/AdminBroadcastSection";

export default function ReglagesPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useMemberSession(code);
  const { data, error, isLoading, refresh } = useGroupData(code, session?.token ?? null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace(`/rejoindre?code=${code}`);
  }, [sessionLoading, session, router, code]);

  useEffect(() => {
    if (data && !data.me.isAdmin) router.replace(`/g/${code}`);
  }, [data, router, code]);

  if (sessionLoading || !session) return null;
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
  if (!data.me.isAdmin) return null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-3xl mx-auto">
          <Link href={`/g/${code}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <h1 className="font-display text-xl">Réglages du groupe</h1>
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col gap-10 p-4 sm:p-6 pb-24">
        <IdentitySection token={session.token} groupCode={code} groupName={data.group.name} onRefresh={refresh} />
        <hr className="border-border" />
        <JoinRequestsSection token={session.token} groupCode={code} onRefresh={refresh} />
        <MembersSection
          token={session.token}
          groupCode={code}
          members={data.members}
          meMemberId={data.me.memberId}
          isOwner={data.me.isOwner}
          onRefresh={refresh}
        />
        <hr className="border-border" />
        <ParamsSection token={session.token} groupCode={code} settings={data.group.settings} onRefresh={refresh} />
        <hr className="border-border" />
        <NotificationsSection
          token={session.token}
          groupCode={code}
          notificationEvents={data.group.settings.notification_events}
          onRefresh={refresh}
        />
        <hr className="border-border" />
        <AdminBroadcastSection token={session.token} groupCode={code} members={data.members} />
        <hr className="border-border" />
        <DiscordSection
          token={session.token}
          groupCode={code}
          discordGuildId={data.group.discord_guild_id}
          discordChannelId={data.group.discord_channel_id}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
