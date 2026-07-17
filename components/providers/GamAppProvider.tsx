"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const STORAGE_KEY = "gam-analytics:selected-period";

export interface GamPeriod {
  month: number;
  week: number;
}

export interface GamSyncState {
  lastSyncAt: string | null;
  syncing: boolean;
}

export interface GamAppContextValue {
  period: GamPeriod;
  sync: GamSyncState;
  setMonth: (month: number) => void;
  setWeek: (week: number) => void;
  setPeriod: (period: GamPeriod) => void;
  resetToCurrentPeriod: () => void;
  startSync: () => void;
  finishSync: (syncedAt?: string) => void;
}

const GamAppContext =
  createContext<GamAppContextValue | null>(null);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getCurrentGamPeriod(
  date = new Date()
): GamPeriod {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = clamp(Math.ceil(day / 7), 1, 5);

  return {
    month,
    week
  };
}

function isValidPeriod(
  value: unknown
): value is GamPeriod {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const candidate = value as Partial<GamPeriod>;

  return (
    Number.isInteger(candidate.month) &&
    Number.isInteger(candidate.week) &&
    Number(candidate.month) >= 1 &&
    Number(candidate.month) <= 12 &&
    Number(candidate.week) >= 1 &&
    Number(candidate.week) <= 5
  );
}

function readStoredPeriod(): GamPeriod | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      STORAGE_KEY
    );

    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    return isValidPeriod(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function saveStoredPeriod(period: GamPeriod) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(period)
    );
  } catch {
    // O sistema continua funcionando mesmo se
    // o navegador bloquear o localStorage.
  }
}

export interface GamAppProviderProps {
  children: ReactNode;
}

export function GamAppProvider({
  children
}: GamAppProviderProps) {
  const [period, setPeriodState] =
    useState<GamPeriod>(() =>
      getCurrentGamPeriod()
    );

  const [sync, setSync] =
    useState<GamSyncState>({
      lastSyncAt: null,
      syncing: false
    });

  useEffect(() => {
    const saved = readStoredPeriod();

    if (saved) {
      setPeriodState(saved);
    }
  }, []);

  useEffect(() => {
    saveStoredPeriod(period);
  }, [period]);

  const setMonth = useCallback(
    (month: number) => {
      setPeriodState((current) => ({
        ...current,
        month: clamp(
          Math.trunc(month),
          1,
          12
        )
      }));
    },
    []
  );

  const setWeek = useCallback(
    (week: number) => {
      setPeriodState((current) => ({
        ...current,
        week: clamp(
          Math.trunc(week),
          1,
          5
        )
      }));
    },
    []
  );

  const setPeriod = useCallback(
    (nextPeriod: GamPeriod) => {
      setPeriodState({
        month: clamp(
          Math.trunc(nextPeriod.month),
          1,
          12
        ),
        week: clamp(
          Math.trunc(nextPeriod.week),
          1,
          5
        )
      });
    },
    []
  );

  const resetToCurrentPeriod =
    useCallback(() => {
      setPeriodState(
        getCurrentGamPeriod()
      );
    }, []);

  const startSync = useCallback(() => {
    setSync((current) => ({
      ...current,
      syncing: true
    }));
  }, []);

  const finishSync = useCallback(
    (syncedAt = new Date().toISOString()) => {
      setSync({
        syncing: false,
        lastSyncAt: syncedAt
      });
    },
    []
  );

  const value = useMemo<GamAppContextValue>(
    () => ({
      period,
      sync,
      setMonth,
      setWeek,
      setPeriod,
      resetToCurrentPeriod,
      startSync,
      finishSync
    }),
    [
      finishSync,
      period,
      resetToCurrentPeriod,
      setMonth,
      setPeriod,
      setWeek,
      startSync,
      sync
    ]
  );

  return (
    <GamAppContext.Provider value={value}>
      {children}
    </GamAppContext.Provider>
  );
}

export function useGamApp() {
  const context = useContext(GamAppContext);

  if (!context) {
    throw new Error(
      "useGamApp deve ser usado dentro de GamAppProvider."
    );
  }

  return context;
}

export default GamAppProvider;
