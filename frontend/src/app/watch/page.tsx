import type { Metadata } from "next";
import Link from "next/link";
import { CITIES } from "@/lib/cities";
import {
  breadcrumbLd,
  buildMetadata,
  faqLd,
  itemListLd,
  paths,
} from "@/lib/seo";
import { SeoShell } from "@/components/seo/SeoShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Faq } from "@/components/seo/Faq";
import { JsonLd } from "@/components/JsonLd";
import styles from "@/components/seo/seo.module.css";

export const revalidate = 3600;

const TITLE = "Where to Watch the FIFA World Cup 2026 | FanWatch";
const DESCRIPTION =
  "Find the best bars, pubs, and fan zones to watch the 2026 FIFA World Cup near you — ranked by atmosphere, team support, and live-match coverage across every host city.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: paths.watchIndex(),
});

const FAQ = [
  {
    q: "How does FanWatch rank venues?",
    a: "Each venue is scored on atmosphere, how reliably it shows live matches, fan and team support, ratings, and distance from your chosen spot — so the top of every list is genuinely the best place to catch the game.",
  },
  {
    q: "Which cities are covered?",
    a: "Every 2026 World Cup host city across the United States, Canada, and Mexico, plus major football cities worldwide. Pick a city to see ranked watch spots near the stadium and downtown.",
  },
  {
    q: "Is FanWatch free?",
    a: "Yes. Browsing watch spots, fan zones, and fixtures is completely free.",
  },
];

export default function WatchIndexPage() {
  const cities = [...CITIES];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Where to watch", path: paths.watchIndex() },
  ];
  const ld = [
    breadcrumbLd(crumbs),
    itemListLd(cities.map((c) => ({ name: c.name, path: paths.city(c.slug) }))),
    faqLd(FAQ),
  ];

  return (
    <SeoShell>
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Where to watch" }]} />
      <section className={styles.hero}>
        <h1 className={styles.h1}>Where to watch the FIFA World Cup 2026</h1>
        <p className={styles.lede}>
          The best places to watch every match — bars, pubs, and fan zones near
          you, ranked by atmosphere and live coverage. Choose your city to get
          started.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Pick your city</h2>
        <div className={styles.grid}>
          {cities.map((c) => (
            <Link key={c.slug} href={paths.city(c.slug)} className={styles.card}>
              <div className={styles.cardTitle}>
                <span>{c.country}</span> {c.name}
              </div>
              {c.stadium && <div className={styles.cardMeta}>{c.stadium.name}</div>}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Frequently asked questions</h2>
        <Faq items={FAQ} />
      </section>
    </SeoShell>
  );
}
