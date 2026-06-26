"use client";

/**
 * Anonymous watch-spot (venue) engagement (v1, no login).
 *
 * Mirrors the fan-event EventEngagement component so both surfaces feel
 * identical, with one difference: a venue is persistent (no kickoff), so all
 * three actions are always available rather than phase-gated:
 *   · "I'm here"  — presence + favorite team (like an event RSVP)
 *   · Vibe        — live atmosphere posts
 *   · Review      — a 1..5 rating + comment
 *
 * Identity is a device-scoped anon id (see lib/anon.ts) — never an account.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAnonId, getStoredTeam, setStoredTeam } from "@/lib/anon";
import { TEAMS, teamLabel } from "@/lib/teams";
import { VIBE_MAX, VIBE_MIN, vibeBand, vibeLabel } from "@/lib/vibes";
import { formatKickoff } from "@/lib/format";
import type {
  PresenceSummary,
  VenueReviewSummary,
  VenueVibe,
} from "@/lib/types";
import styles from "@/components/event/eventEngagement.module.css";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

interface Props {
  venueId: string;
  initialPresence: PresenceSummary;
  initialReviews: VenueReviewSummary;
}

export function VenueEngagement({
  venueId,
  initialPresence,
  initialReviews,
}: Props) {
  const [anonId, setAnonId] = useState("");
  const [team, setTeam] = useState("");
  const [presence, setPresence] = useState<PresenceSummary>(initialPresence);
  const [vibes, setVibes] = useState<VenueVibe[]>([]);
  const [reviews, setReviews] = useState<VenueReviewSummary>(initialReviews);
  const [intensity, setIntensity] = useState(5);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Hydrate anonymous identity, this device's presence, and the feeds.
  useEffect(() => {
    const id = getAnonId();
    setAnonId(id);
    setTeam(getStoredTeam());
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const [p, vibeRes, rev] = await Promise.all([
          api.getVenuePresence(venueId, id),
          api.listVenueVibes(venueId),
          api.listVenueFanReviews(venueId),
        ]);
        if (!active) return;
        setPresence(p);
        setVibes(vibeRes.vibes);
        setReviews(rev);
        if (p.favoriteTeam) setTeam(p.favoriteTeam);
      } catch {
        // Keep the server-provided initial state on failure.
      }
    })();
    return () => {
      active = false;
    };
  }, [venueId]);

  async function toggleHere() {
    if (!anonId || busy) return;
    setBusy(true);
    setError("");
    try {
      const summary = await api.setVenuePresence(venueId, anonId, {
        here: !presence.here,
        favoriteTeam: team || undefined,
      });
      setPresence(summary);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeTeam(code: string) {
    setTeam(code);
    setStoredTeam(code);
    if (presence.here && anonId) {
      try {
        setPresence(
          await api.setVenuePresence(venueId, anonId, {
            here: true,
            favoriteTeam: code || undefined,
          }),
        );
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
      const vibe = await api.postVenueVibe(
        venueId,
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
      await api.reviewVenue(venueId, anonId, rating, {
        comment: comment.trim() || undefined,
        favoriteTeam: team || undefined,
      });
      setReviews(await api.listVenueFanReviews(venueId));
      setComment("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const teamEntries = useMemo(
    () => Object.entries(presence.teams).sort((a, b) => b[1] - a[1]),
    [presence.teams],
  );

  return (
    <div className={styles.wrap}>
      {error && <p className={styles.error}>{error}</p>}

      {/* ── Presence ─────────────────────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Who&apos;s here</h2>
          <span className={styles.count}>
            {presence.count} {presence.count === 1 ? "fan" : "fans"} here
          </span>
        </div>
        <div className={styles.rsvpRow}>
          <button
            type="button"
            className={`${styles.goingBtn} ${presence.here ? styles.active : ""}`}
            onClick={toggleHere}
            disabled={busy || !anonId}
          >
            {presence.here ? "You're here ✓" : "I'm here"}
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

      {/* ── Vibes ────────────────────────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>How&apos;s the vibe?</h2>
        </div>
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
          <p className={styles.empty}>No vibes yet — set the energy above.</p>
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
            placeholder="How was the spot to watch the match? (optional)"
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
