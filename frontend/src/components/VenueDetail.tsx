"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import type {
  CheckIn,
  CrowdEstimate,
  CrowdLevel,
  CrowdStatus,
  Photo,
  RankedVenue,
  Review,
  VenueListing,
} from "@/lib/types";
import { formatDistance } from "@/lib/format";
import { teamLabel } from "@/lib/teams";
import { FEATURES } from "@/lib/features";

const CROWD_LEVELS: CrowdLevel[] = ["empty", "quiet", "lively", "packed"];
const CROWD_EMOJI: Record<CrowdLevel, string> = {
  empty: "🪑",
  quiet: "🙂",
  lively: "🎉",
  packed: "🔥",
};

export function VenueDetail({
  venue,
  city,
  onClose,
}: {
  venue: RankedVenue;
  city: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [crowd, setCrowd] = useState<CrowdStatus | null>(null);
  const [estimate, setEstimate] = useState<CrowdEstimate | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [listing, setListing] = useState<VenueListing | null>(null);
  const [bizName, setBizName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(async () => {
    const [r, c, cr, est, p, lst] = await Promise.all([
      api.listReviews(venue.id),
      api.listCheckIns(venue.id),
      api.crowdStatus(venue.id),
      api.crowdEstimate(venue.id, city),
      api.listPhotos(venue.id),
      api.venueListing(venue.id),
    ]);
    setReviews(r.reviews);
    setAvg(r.averageRating);
    setCheckins(c.checkins);
    setCrowd(cr);
    setEstimate(est);
    setPhotos(p.photos);
    setListing(lst);
  }, [venue.id, city]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const guard = (fn: () => Promise<void>) => async () => {
    if (!user) {
      setError("Log in to do that.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = guard(async () => {
    await api.addReview(venue.id, rating, comment || undefined);
    setComment("");
  });
  const checkIn = guard(async () => {
    await api.checkIn(venue.id);
  });
  const reportCrowd = (level: CrowdLevel) =>
    guard(async () => {
      await api.reportCrowd(venue.id, level);
    })();

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void guard(async () => {
        await api.uploadPhoto(venue.id, reader.result as string);
      })();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <aside
        className="panel"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(460px, 100%)",
          borderRadius: 0,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="row"
          style={{ position: "sticky", top: 0, background: "var(--panel)" }}
        >
          <span>{venue.name}</span>
          <button onClick={onClose}>✕</button>
        </h2>

        <div className="rec">
          <div className="muted">
            {venue.kind} · {formatDistance(venue.distanceMeters)} away
            {avg !== null ? ` · ★ ${avg}` : ""}
          </div>
          <div className="badges" style={{ marginTop: 8 }}>
            {(venue.featured || listing?.featured) && (
              <span
                className="badge"
                style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
              >
                ★ Featured
              </span>
            )}
            {venue.supportsTeams.map((t) => (
              <span key={t} className="badge team">
                {teamLabel(t)}
              </span>
            ))}
            <span className="badge">
              match score {Math.round(venue.finalScore * 100)}
            </span>
          </div>
        </div>

        {/* Live crowd */}
        <h2>Live crowd</h2>
        <div className="rec">
          <div style={{ marginBottom: 8 }}>
            {crowd?.level ? (
              <strong>
                {CROWD_EMOJI[crowd.level]} {crowd.level}{" "}
                <span className="muted">
                  ({crowd.recentReports} recent reports)
                </span>
              </strong>
            ) : estimate ? (
              <span>
                <strong>
                  {CROWD_EMOJI[estimate.level]} Likely {estimate.level}
                </strong>{" "}
                <span
                  className="badge"
                  style={{
                    color: "var(--accent-2)",
                    borderColor: "var(--accent-2)",
                  }}
                >
                  estimated · {Math.round(estimate.confidence * 100)}% conf
                </span>
              </span>
            ) : (
              <span className="muted">No recent reports — be the first.</span>
            )}
          </div>
          <div
            className="row"
            style={{ justifyContent: "flex-start", gap: 6, flexWrap: "wrap" }}
          >
            {FEATURES.engagement &&
              CROWD_LEVELS.map((l) => (
                <button key={l} disabled={busy} onClick={() => reportCrowd(l)}>
                  {CROWD_EMOJI[l]} {l}
                </button>
              ))}
          </div>
        </div>

        {/* Check in */}
        <h2>Check-ins ({checkins.length})</h2>
        {FEATURES.engagement && (
          <div className="rec">
            <button className="primary" disabled={busy} onClick={checkIn}>
              📍 Check in here
            </button>
          </div>
        )}
        {checkins.slice(0, 5).map((c) => (
          <div className="event" key={c.id}>
            <strong>{c.userName}</strong>{" "}
            <span className="muted">checked in</span>
            {c.note ? <div className="muted">“{c.note}”</div> : null}
          </div>
        ))}

        {/* Reviews */}
        <h2>Reviews ({reviews.length})</h2>
        {FEATURES.engagement && (
          <div className="rec">
            <div
              className="row"
              style={{ justifyContent: "flex-start", gap: 8 }}
            >
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}
                  </option>
                ))}
              </select>
              <input
                style={{ flex: 1 }}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience…"
              />
              <button
                className="primary"
                disabled={busy}
                onClick={submitReview}
              >
                Post
              </button>
            </div>
          </div>
        )}
        {reviews.slice(0, 8).map((r) => (
          <div className="event" key={r.id}>
            <div>
              <strong>{r.userName}</strong>{" "}
              <span className="badge">{"★".repeat(r.rating)}</span>
            </div>
            {r.comment ? <div className="muted">{r.comment}</div> : null}
          </div>
        ))}

        {/* Photos */}
        <h2>Fan photos ({photos.length})</h2>
        {FEATURES.engagement && (
          <div className="rec">
            <input
              type="file"
              accept="image/*"
              onChange={onPhoto}
              disabled={busy}
            />
          </div>
        )}
        <div
          className="rec"
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.dataUrl}
              alt={p.caption ?? "fan photo"}
              width={84}
              height={84}
              style={{
                objectFit: "cover",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            />
          ))}
          {photos.length === 0 && <span className="muted">No photos yet.</span>}
        </div>

        {/* Business / sponsorship */}
        {FEATURES.business && (
          <>
            <h2>For businesses</h2>
            <div className="rec">
              {listing?.claimed ? (
                <div className="muted">
                  Claimed by <strong>{listing.businessName}</strong>
                  {listing.featured ? " · ★ Featured listing active" : ""}
                </div>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <input
                    style={{ flex: 1 }}
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    placeholder="Your business name"
                  />
                  <button
                    disabled={busy || !bizName.trim()}
                    onClick={guard(async () => {
                      await api.claimVenue(venue.id, bizName.trim());
                      setBizName("");
                    })}
                  >
                    Claim
                  </button>
                </div>
              )}
              {listing?.claimed && !listing.featured && (
                <button
                  className="primary"
                  style={{ marginTop: 8 }}
                  disabled={busy}
                  onClick={guard(async () => {
                    await api.featureVenue(venue.id, "premium", 30);
                  })}
                >
                  ★ Promote (feature for 30 days)
                </button>
              )}
            </div>
          </>
        )}

        {FEATURES.auth && !user && (
          <div className="empty" style={{ color: "var(--accent-2)" }}>
            Log in to review, check in, report crowd, add photos, or claim this
            venue.
          </div>
        )}
        {error && (
          <div className="empty" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </aside>
    </div>
  );
}
