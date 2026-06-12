import styles from "./seo.module.css";

/** Renders the visible FAQ. Pair with `faqLd` for the FAQPage structured data. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className={styles.faq}>
      {items.map((it, i) => (
        <div className={styles.faqItem} key={i}>
          <p className={styles.faqQ}>{it.q}</p>
          <p className={styles.faqA}>{it.a}</p>
        </div>
      ))}
    </div>
  );
}
