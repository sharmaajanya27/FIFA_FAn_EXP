"use client";

/**
 * Anonymous fan-event engagement (v1, no login).
 *
 * One client component drives the three interactions around a fan event, gated
 * by the event's timing:
 *   · upcoming → RSVP ("I'm going" + favorite team)
 *   · live     → post live "vibe" updates about the atmosphere
 *   · ended    → leave a post-event review (1..5 + comment)
 *
 * Identity is a device-scoped anon id (see lib/anon.ts) — never an account.
 * The server passes initial summaries for fast first paint; on mount we hydrate
 * the anon id, learn whether *this* device is going, and load the feeds.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAnonId, getStoredTeam, setStoredTeam } from "@/lib/anon";
import { TEAMS, teamLabel } from "@/lib/teams";
import { VIBE_MAX, VIBE_MIN, vibeBand, vibeLabel } from "@/lib/vibes";
import { formatKickoff } from "@/lib/format";
import type { EventReviewSummary, EventVibe, RsvpSummary } from "@/lib/types";
import styles from "./eventEngagement.module.css";

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000; // matches stay "live" for 3 hours
type Phase = "upcoming" | "live" | "ended";

function phaseOf(startTime: string): Phase {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || now < start) return "upcoming";
  if (now < start + LIVE_WINDOW_MS) return "live";
  return "ended";
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

interface Props {
  eventId: string;
  startTime: string;
  eventTeams: string[];
  initialRsvps: RsvpSummary;
  initialReviews: EventReviewSummary;
}

export function EventEngagement({
  eventId,
  startTime,
  eventTeams,
  initialRsvps,
  initialReviews,
}: Props) {
  const phase = useMemo(() => phaseOf(startTime), [startTime]);
  const defaultTeam = eventTeams[0] ?? "";

  const [anonId, setAnonId] = useState("");
  const [team, setTeam] = useState("");
  const [rsvps, setRsvps] = useState<RsvpSummary>(initialRsvps);
  const [vibes, setVibes] = useState<EventVibe[]>([]);
  const [reviews, setReviews] = useState<EventReviewSummary>(initialReviews);
  const [intensity, setIntensity] = useState(5);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Hydrate anonymous identity, this device's going-state, and the feeds.
  useEffect(() => {
    const id = getAnonId();
    setAnonId(id);
    setTeam(getStoredTeam() || defaultTeam);
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const [detail, vibeRes] = await Promise.all([
          api.getEvent(eventId, id),
          api.listEventVibes(eventId),
        ]);
        if (!active) return;
        setRsvps(detail.rsvps);
        setReviews(detail.reviews);
        setVibes(vibeRes.vibes);
        if (detail.rsvps.favoriteTeam) setTeam(detail.rsvps.favoriteTeam);
      } catch {
        // Keep the server-provided initial state on failure.
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId, defaultTeam]);

  async function toggleGoing() {
    if (!anonId || busy) return;
    setBusy(true);
    setError("");
    try {
      const summary = await api.rsvpEvent(eventId, anonId, {
        going: !rsvps.going,
        favoriteTeam: team || undefined,
      });
      setRsvps(summary);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeTeam(code: string) {
    setTeam(code);
    setStoredTeam(code);
    if (rsvps.going && anonId) {
      try {
        const summary = await api.rsvpEvent(eventId, anonId, {
          going: true,
          favoriteTeam: code || undefined,
        });
        setRsvps(summary);
      } catch (e) {
        setError(errMsg(e));
      }
    }
  }

  async function postVibe() {
    if (!anonId || busy) return;
    setBusy(true);
    setError("");
    try {
      const vibe = await api.postEventVibe(
        eventId,
        anonId,
        intensity,
        team || undefined,
      );
      setVibes((prev) => [vibe, ...prev]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    if (!anonId || rating < 1 || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.reviewEvent(eventId, anonId, rating, {
        comment: comment.trim() || undefined,
        favoriteTeam: team || undefined,
      });
      setReviews(await api.listEventReviews(eventId));
      setComment("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const teamEntries = Object.entries(rsvps.teams).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.wrap}>
      {error && <p className={styles.error}>{error}</p>}

      {/* ── RSVP ─────────────────────────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Who&apos;s going</h2>
          <span className={styles.count}>
            {rsvps.count} {rsvps.count === 1 ? "fan" : "fans"} going
          </span>
        </div>
        <div className={styles.rsvpRow}>
          <button
            type="button"
            className={`${styles.goingBtn} ${rsvps.going ? styles.active : ""}`}
            onClick={toggleGoing}
            disabled={busy || !anonId}
          >
            {rsvps.going ? "You're going ✓" : "I'm going"}
          </button>
          <label className={styles.muted}>
            Repping{" "}
            <select
              className={styles.select}
              value={team}
              onChange={(e) => changeTeam(e.target.value)}
            >
              <option value="">No team</option>
              {TEAMS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.flag} {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {teamEntries.length > 0 && (
          <div className={styles.teamTally}>
            {teamEntries.map(([code, n]) => (
              <span key={code} className={styles.pill}>
                {teamLabel(code)} · {n}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Live vibes ───────────────────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Live vibes</h2>
          {phase === "live" && (
            <span className={styles.muted}>Happening now</span>
          )}
        </div>
        {phase === "live" ? (
          <>
            <p className={styles.muted}>
              Slide the energy right now — 0 is dead, 10 is electric.
            </p>
            <div className={styles.sliderRow}>
              <span className={styles.sliderValue}>
                {vibeBand(intensity).emoji} {intensity}
              </span>
              <input
                type="range"
                className={styles.slider}
                min={VIBE_MIN}
                max={VIBE_MAX}
                step={1}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                aria-label="Vibe intensity"
              />
              <button
                type="button"
                className={styles.submit}
                onClick={postVibe}
                disabled={busy || !anonId}
              >
                Post
              </button>
            </div>
          </>
        ) : phase === "upcoming" ? (
          <p className={styles.locked}>
            Vibes open once the match kicks off. RSVP so you don&apos;t miss it.
          </p>
        ) : (
          <p className={styles.locked}>
            This event has ended — here&apos;s how it went.
          </p>
        )}

        {vibes.length > 0 ? (
          <div className={styles.feed}>
            {vibes.map((v) => (
              <div key={v.id} className={styles.feedItem}>
                <div className={styles.feedMeta}>
                  <span className={styles.avg}>{vibeLabel(v.intensity)}</span>
                  <span>
                    · {v.favoriteTeam ? teamLabel(v.favoriteTeam) : "A fan"} ·{" "}
                    {formatKickoff(v.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          phase !== "upcoming" && (
            <p className={styles.empty}>No vibes yet. Be the first.</p>
          )
        )}
      </section>

      {/* ── Reviews ──────────────────────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Reviews</h2>
          {reviews.averageRating != null && (
            <span className={styles.avg}>
              ★ {reviews.averageRating.toFixed(1)} ({reviews.count})
            </span>
          )}
        </div>
        {phase === "ended" ? (
          <div className={styles.compose}>
            <div
              className={styles.stars}
              role="radiogroup"
              aria-label="Your rating"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.star} ${n <= rating ? styles.on : ""}`}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className={styles.textarea}
              placeholder="How was the crowd, the energy, the spot? (optional)"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className={styles.composeRow}>
              <span className={styles.muted}>One review per device</span>
              <button
                type="button"
                className={styles.submit}
                onClick={submitReview}
                disabled={busy || rating < 1 || !anonId}
              >
                Submit review
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.locked}>
            Reviews open after the event wraps up.
          </p>
        )}

        {reviews.reviews.length > 0 && (
          <div className={styles.feed}>
            {reviews.reviews.map((r) => (
              <div key={r.id} className={styles.feedItem}>
                <div className={styles.feedMeta}>
                  <span className={styles.avg}>★ {r.rating}</span>
                  <span>
                    · {r.favoriteTeam ? teamLabel(r.favoriteTeam) : "A fan"} ·{" "}
                    {formatKickoff(r.createdAt)}
                  </span>
                </div>
                {r.comment && <p className={styles.feedText}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
