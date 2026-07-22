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

  return { data, error, isLoading, refresh };
}
