"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { GroupState } from "@/types";

const NORMAL_POLL_MS = 7000;
const BACKOFF_POLL_MS = 30000;
const BACKOFF_THRESHOLD = 3;

export function useGroupData(groupCode: string, token: string | null) {
  const [data, setData] = useState<GroupState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const consecutiveErrorsRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const state = await apiFetch<GroupState>(`/api/groups/${groupCode}`, { token });
      setData(state);
      consecutiveErrorsRef.current = 0;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger le groupe.");
      consecutiveErrorsRef.current += 1;
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    // Poll à intervalle variable plutôt que setInterval fixe : après 3 échecs consécutifs
    // (ex. connexion instable), espace les tentatives à 30s au lieu de 7s ; un seul succès
    // suffit à revenir au rythme normal.
    function scheduleNext() {
      if (cancelled) return;
      const delay = consecutiveErrorsRef.current >= BACKOFF_THRESHOLD ? BACKOFF_POLL_MS : NORMAL_POLL_MS;
      timeoutId = setTimeout(async () => {
        if (document.visibilityState === "visible") {
          await refresh();
        }
        scheduleNext();
      }, delay);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    scheduleNext();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return { data, error, isLoading, refresh };
}
