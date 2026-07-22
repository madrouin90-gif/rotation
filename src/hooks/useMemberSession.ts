"use client";

import { useCallback, useEffect, useState } from "react";
import { clearSession, getSession, saveSession, type MemberSession } from "@/lib/session";

export function useMemberSession(groupCode: string) {
  const [session, setSessionState] = useState<MemberSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Lecture d'un système externe (localStorage) au montage / changement de groupe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionState(getSession(groupCode));
    setIsLoading(false);
  }, [groupCode]);

  const setSession = useCallback((next: MemberSession) => {
    saveSession(next);
    setSessionState(next);
  }, []);

  const removeSession = useCallback(() => {
    clearSession(groupCode);
    setSessionState(null);
  }, [groupCode]);

  return { session, isLoading, setSession, removeSession };
}
