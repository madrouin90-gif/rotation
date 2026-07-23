"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { GroupState } from "@/types";

export function useGroupData(groupCode: string, token: string | null) {
  const [data, setData] = useState<GroupState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const state = await apiFetch<GroupState>(`/api/groups/${groupCode}`, { token });
      setData(state);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger le groupe.");
    } finally {
      setIsLoading(false);
    }
  }, [groupCode, token]);

  useEffect(() => {
    // Récupération d'un système externe (l'API) au montage / changement de groupe ou de token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    const POLL_MS = 7000;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") refresh();
      }, POLL_MS);
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return { data, error, isLoading, refresh };
}
