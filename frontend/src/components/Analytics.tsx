"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { PageContext, PageViewPayload } from "@/lib/types";

const SESSION_KEY = "fanwatch_sid";

/** Stable per-browser id (not tied to a logged-in user). */
function sessionId(): string {
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Derive entity context from the URL so the dashboard can group traffic. */
function contextFor(path: string): PageContext {
  const venue = path.match(/^\/venue\/([^/]+)\/([^/]+)/);
  if (venue) return { type: "venue", city: venue[1], venueId: venue[2] };
  const cityTeam = path.match(/^\/watch\/([^/]+)\/([^/]+)/);
  if (cityTeam) return { type: "team", city: cityTeam[1], team: cityTeam[2].toUpperCase() };
  const city = path.match(/^\/watch\/([^/]+)/);
  if (city) return { type: "city", city: city[1] };
  if (path === "/") return { type: "home" };
  return { type: "other" };
}

function referrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const host = new URL(document.referrer).host;
    return host && host !== window.location.host ? host : undefined;
  } catch {
    return undefined;
  }
}

function utm(): PageViewPayload["utm"] {
  try {
    const sp = new URLSearchParams(window.location.search);
    const source = sp.get("utm_source") ?? undefined;
    const medium = sp.get("utm_medium") ?? undefined;
    const campaign = sp.get("utm_campaign") ?? undefined;
    return source || medium || campaign ? { source, medium, campaign } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * First-party pageview beacon. Mounted once in the root layout; fires on every
 * client route change. Tracks pathname only (no search params) so it doesn't
 * force a Suspense boundary. Admin pages are excluded to avoid skewing data.
 */
export function Analytics() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (last.current === pathname) return;
    last.current = pathname;
    void api
      .recordPageView({
        path: pathname,
        sessionId: sessionId(),
        referrerHost: referrerHost(),
        context: contextFor(pathname),
        utm: utm(),
      })
      .catch(() => {
        /* beacon is best-effort */
      });
  }, [pathname]);

  return null;
}
