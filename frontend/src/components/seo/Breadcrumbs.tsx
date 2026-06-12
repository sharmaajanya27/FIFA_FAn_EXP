import { Fragment } from "react";
import Link from "next/link";
import styles from "./seo.module.css";

/** Visual breadcrumb trail. Pair with `breadcrumbLd` for the structured data. */
export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span>/</span>}
          {it.path ? <Link href={it.path}>{it.name}</Link> : <span>{it.name}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
