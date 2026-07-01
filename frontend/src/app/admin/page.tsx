"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { cityBySlug } from "@/lib/cities";
import { teamByCode } from "@/lib/teams";
import type {
  AnalyticsCountEntry,
  AnalyticsDailyPoint,
  AnalyticsRange,
  AnalyticsSummary,
} from "@/lib/types";
import styles from "./admin.module.css";

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

type LoadState = "idle" | "loading" | "ready" | "denied" | "error";

export default function AdminPage() {
  const { loading: authLoading } = useAuth();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>();

  const fetchSummary = useCallback(async (r: AnalyticsRange) => {
    setState("loading");
    setErrorMsg(undefined);
    try {
      setSummary(await api.analyticsSummary(r));
      setState("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load analytics";
      setErrorMsg(msg);
      setState(/admin|forbidden/i.test(msg) ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    // User login is disabled in v1 — attempt to fetch anyway (the API will
    // return 401/403 if the request lacks admin credentials).
    void fetchSummary(range);
  }, [authLoading, range, fetchSummary]);

  if (authLoading) {
    return <div className={styles.empty} style={{ textAlign: "center", marginTop: "4rem" }}>Loading…</div>;
  }

  if (state === "denied" || state === "idle") {
    return (
      <div className={styles.gate}>
        <h1>Tu Parea Admin</h1>
        <p>Admin access is not available in this version.</p>
      </div>
    );
  }

  const viewsPerDay = summary
    ? Math.round(summary.totalViews / Math.max(1, summary.rangeDays))
    : 0;
  const topCity = summary?.topCities[0];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Traffic</h1>
          <div className={styles.sub}>
            Tu Parea Admin
            {summary
              ? ` · updated ${new Date(summary.generatedAt).toLocaleTimeString()}`
              : ""}
          </div>
        </div>
        <div className={styles.ranges}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ""}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {state === "error" && <div className={styles.error}>{errorMsg}</div>}
      {!summary && state === "loading" && <div className={styles.empty}>Loading…</div>}

      {summary && (
        <>
          <div className={styles.kpiGrid}>
            <Kpi label="Pageviews" value={summary.totalViews} />
            <Kpi label="Unique visitors" value={summary.uniqueSessions} />
            <Kpi label="Views / day" value={viewsPerDay} />
            <Kpi
              label="Top city"
              value={topCity ? (cityBySlug(topCity.key)?.name ?? topCity.key) : "—"}
            />
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Pageviews per day</h2>
            <TrendChart data={summary.daily} />
          </div>

          <div className={styles.grid2}>
            <Panel title="Top pages">
              <StatTable rows={summary.topPaths} empty="pages" />
            </Panel>
            <Panel title="Top cities">
              <StatTable
                rows={summary.topCities}
                empty="cities"
                format={(k) => cityBySlug(k)?.name ?? k}
              />
            </Panel>
            <Panel title="Top teams">
              <StatTable
                rows={summary.topTeams}
                empty="teams"
                format={(k) => {
                  const t = teamByCode(k);
                  return t ? `${t.flag} ${t.name}` : k;
                }}
              />
            </Panel>
            <Panel title="Referrers">
              <StatTable rows={summary.topReferrers} empty="referrers" />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiNum}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {children}
    </div>
  );
}

function StatTable({
  rows,
  empty,
  format,
}: {
  rows: AnalyticsCountEntry[];
  empty: string;
  format?: (key: string) => string;
}) {
  if (!rows.length) return <div className={styles.empty}>No {empty} yet.</div>;
  return (
    <table className={styles.table}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td className={styles.key} title={r.key}>
              {format ? format(r.key) : r.key}
            </td>
            <td className={styles.num}>{r.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrendChart({ data }: { data: AnalyticsDailyPoint[] }) {
  if (!data.length) return <div className={styles.empty}>No data yet.</div>;
  const W = 720;
  const H = 150;
  const pad = 3;
  const max = Math.max(1, ...data.map((d) => d.views));
  const bw = W / data.length;
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${W} ${H + 22}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily pageviews"
    >
      {data.map((d, i) => {
        const h = Math.round((d.views / max) * H);
        return (
          <g key={d.date}>
            <rect
              className={styles.bar}
              x={i * bw + pad}
              y={H - h}
              width={Math.max(1, bw - 2 * pad)}
              height={h}
              rx={2}
            />
            {data.length <= 14 && (
              <text
                className={styles.barLabel}
                x={i * bw + bw / 2}
                y={H + 15}
                textAnchor="middle"
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
