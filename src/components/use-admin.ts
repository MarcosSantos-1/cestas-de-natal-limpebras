"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { api } from "@/lib/api-client";
import type { Admin, Employee } from "@/lib/domain";
export type Stats = {
  total: number;
  active: number;
  delivered: number;
  scheduled: number;
};
export type ListResult = { items: Employee[]; cursor: string | null };
export type AdminTab = "check" | "employees" | "overview" | "account";
export function useAdmin() {
  const [user, setUser] = useState<User | null>(null),
    [admin, setAdmin] = useState<Admin | null>(null),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState<AdminTab>("check"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [stats, setStats] = useState<Stats | null>(null),
    [rows, setRows] = useState<Employee[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [query, setQuery] = useState("");
  const session = useRef(0);
  const call = useCallback(
    async <T>(
      action: string,
      payload: Record<string, unknown> = {},
    ): Promise<T> => {
      const current = clientAuth().currentUser;
      if (!current) throw new Error("Entre novamente.");
      return api<T>(action, payload, await current.getIdToken());
    },
    [],
  );
  const refresh = useCallback(async () => {
    const generation = session.current;
    const result = await call<Stats>("admin.stats");
    if (generation === session.current) setStats(result);
  }, [call]);
  const loadEmployees = useCallback(
    async (search = "", append = false, next: string | null = null) => {
      const generation = session.current;
      const result = await call<ListResult>("admin.list", {
        query: search,
        cursor: next,
      });
      if (generation !== session.current) return;
      setRows((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.cursor);
      setQuery(search);
    },
    [call],
  );
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth(), (u) => {
      const generation = ++session.current;
      setUser(u);
      setAdmin(null);
      setRows([]);
      setStats(null);
      setCursor(null);
      setError("");
      setNotice("");
      setTab("check");
      if (!u) {
        setReady(true);
        return;
      }
      setReady(false);
      void u
        .getIdToken()
        .then((token) => api<Admin>("admin.me", {}, token))
        .then((a) => {
          if (generation === session.current) setAdmin(a);
        })
        .catch((e) => {
          if (generation === session.current) setError((e as Error).message);
        })
        .finally(() => {
          if (generation === session.current) setReady(true);
        });
    });
    return () => {
      session.current++;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (admin) void refresh().catch((e) => setError((e as Error).message));
  }, [admin, refresh]);
  const task = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  function navigate(next: AdminTab) {
    if (busy) return;
    setTab(next);
    setError("");
    setNotice("");
    if (next === "employees") void task(() => loadEmployees());
    if (next === "overview") void task(refresh);
  }
  return {
    user,
    admin,
    ready,
    tab,
    navigate,
    error,
    setError,
    notice,
    setNotice,
    busy,
    task,
    stats,
    refresh,
    rows,
    cursor,
    query,
    loadEmployees,
    call,
    logout: () => signOut(clientAuth()),
  };
}
export type AdminController = ReturnType<typeof useAdmin>;
