import Link from "next/link";
import styles from "./seo.module.css";

/** Header + footer chrome shared by every SEO landing page. */
export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Fan<span>Watch</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/watch">Host cities</Link>
          <Link href="/">Live map</Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} FanWatch — find the best place to watch the match.</span>
        <Link href="/watch">All host cities →</Link>
      </footer>
    </div>
  );
}
