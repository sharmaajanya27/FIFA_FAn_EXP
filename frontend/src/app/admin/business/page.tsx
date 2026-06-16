"use client";

/**
 * Admin review of business activity (PRD §8). Lists every business-submitted
 * venue and every user/business-created event. Admin-gated by the same
 * ADMIN_EMAILS allowlist as the traffic dashboard.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { cityBySlug } from "@/lib/cities";
import type { AdminBusinessSummary } from "@/lib/types";
import styles from "../admin.module.css";

type LoadState = "idle" | "loading" | "ready" | "denied" | "error";

export default function AdminBusinessPage() {
  const { loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminBusinessSummary | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>();

  const fetchData = useCallback(async () => {
    setState("loading");
    setErrorMsg(undefined);
    try {
      setData(await api.adminBusiness());
      setState("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setErrorMsg(msg);
      setState(/admin|forbidden/i.test(msg) ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void fetchData();
  }, [authLoading, fetchData]);

  if (authLoading) {
    return <div className={styles.empty} style={{ textAlign: "center", marginTop: "4rem" }}>Loading…</div>;
  }

  if (state === "denied" || state === "idle") {
    return (
      <div className={styles.gate}>
        <h1>FanWatch Admin</h1>
        <p>Admin access is not available in this version.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Business activity</h1>
          <div className={styles.sub}>
            FanWatch Admin
            {data ? ` · ${data.counts.listings} listings · ${data.counts.events} events` : ""}
          </div>
        </div>
        <div className={styles.ranges}>
          <Link href="/admin" className={styles.rangeBtn}>Traffic</Link>
        </div>
      </div>

      {state === "error" && <div className={styles.error}>{errorMsg}</div>}
      {!data && state === "loading" && <div className={styles.empty}>Loading…</div>}

      {data && (
        <>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Business venue listings</h2>
            {data.listings.length === 0 ? (
              <div className={styles.empty}>No business listings yet.</div>
            ) : (
              <table className={styles.table}>
                <tbody>
                  {data.listings.map((l) => (
                    <tr key={l.id}>
                      <td className={styles.key}>
                        <strong>{l.name}</strong>
                        <div style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                          {l.kind} · {cityBySlug(l.city ?? "")?.name ?? l.city}
                          {l.address ? ` · ${l.address}` : ""}
                        </div>
                        <div style={{ fontSize: "0.74rem", opacity: 0.55 }}>
                          by {l.ownerBusinessName ?? l.ownerName}
                          {l.supportsTeams.length ? ` · ${l.supportsTeams.join(", ")}` : ""}
                        </div>
                      </td>
                      <td className={styles.num}>
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Posted events</h2>
            {data.events.length === 0 ? (
              <div className={styles.empty}>No events posted yet.</div>
            ) : (
              <table className={styles.table}>
                <tbody>
                  {data.events.map((ev) => (
                    <tr key={ev.id}>
                      <td className={styles.key}>
                        <strong>{ev.title}</strong>
                        <div style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                          {ev.kind.replace(/_/g, " ")} ·{" "}
                          {cityBySlug(ev.city ?? "")?.name ?? ev.city}
                          {ev.teams.length ? ` · ${ev.teams.join(", ")}` : ""}
                        </div>
                        <div style={{ fontSize: "0.74rem", opacity: 0.55 }}>
                          by {ev.createdByName} · starts{" "}
                          {new Date(ev.startTime).toLocaleString()}
                        </div>
                      </td>
                      <td className={styles.num}>
                        {new Date(ev.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
