"use client";

import { TEAMS } from "@/lib/teams";

export type FestivalNav = "crews" | "fixtures" | "myteam";

interface NavItem {
  id: FestivalNav;
  label: string;
}

interface Props {
  nav: FestivalNav;
  onNav: (nav: FestivalNav) => void;
  /** Items to render — lets the page hide "My Team" when the flag is off. */
  items: NavItem[];
  /** Selected national-team code ("" = all). Drives "Following …". */
  team: string;
  onTeam: (code: string) => void;
  /** Pre-formatted festival day line (e.g. "Match Day · Sun 14 Jun"). */
  dayLabel: string;
}

/**
 * Sticky site masthead in the festival broadsheet style: red rule, the
 * "Tu Parea" wordmark with its Fan Festival gloss, the day line, and a
 * primary nav whose active item is reflected with aria-current. "Following" is
 * the national-team filter that scopes the whole experience.
 */
export function Masthead({
  nav,
  onNav,
  items,
  team,
  onTeam,
  dayLabel,
}: Props) {
  return (
    <header className="masthead">
      <div className="mast-head">
        <span className="mast-brand">
          Tu <span className="tp-2">Parea</span>
        </span>
        <span className="mast-fest">The Fan Festival</span>
        <span className="mast-day">{dayLabel}</span>
      </div>
      <div className="mast-nav-row">
        <nav className="mast-nav" aria-label="Primary">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-link"
              aria-current={nav === item.id ? "page" : undefined}
              onClick={() => onNav(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="following">
            <label htmlFor="following-team">Following</label>
            <select
              id="following-team"
              value={team}
              onChange={(e) => onTeam(e.target.value)}
            >
              <option value="">All teams</option>
              {TEAMS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </span>
        </nav>
      </div>
    </header>
  );
}
