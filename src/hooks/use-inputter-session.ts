"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "arraya_inputter_name";

/**
 * Remembers "who is physically entering data on this device" separately
 * from the logged-in Supabase Auth account — staff can share one login
 * across a shift, so auth.uid() alone doesn't identify the actual
 * inputter. Persisted per-device via localStorage (not synced across
 * devices, not sent to the server directly — each transaction snapshots
 * the name into `inputter_name` at insert time).
 */
export function useInputterSession() {
  const [inputterName, setInputterNameState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setInputterNameState(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Private browsing / storage blocked — fall back to prompting every load.
    }
    setHydrated(true);
  }, []);

  const setInputterName = useCallback((name: string) => {
    setInputterNameState(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // Ignore — session-only for this load if storage isn't available.
    }
  }, []);

  return { inputterName, hydrated, setInputterName };
}
