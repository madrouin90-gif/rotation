"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useGroupData } from "@/hooks/useGroupData";
import { GroupChatPanel } from "@/components/group/GroupChatPanel";

export default function GroupChatPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useMemberSession(code);
  const { data } = useGroupData(code, session?.token ?? null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace(`/rejoindre?code=${code}`);
  }, [sessionLoading, session, router, code]);

  if (sessionLoading || !session) return null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100dvh-0px)]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-3xl mx-auto">
          <Link href={`/g/${code}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <h1 className="font-display text-xl">💬 Chat du groupe</h1>
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto flex-1 min-h-0 p-4 sm:p-6 flex flex-col">
        {data && (
          <GroupChatPanel
            groupCode={code}
            token={session.token}
            myMemberId={data.me.memberId}
            isAdmin={data.me.isAdmin}
          />
        )}
      </div>
    </div>
  );
}
