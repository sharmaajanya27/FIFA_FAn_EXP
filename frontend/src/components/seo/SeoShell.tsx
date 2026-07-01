import styles from "./seo.module.css";

/** Main + footer chrome shared by every SEO landing page. Header + ticker +
 *  bunting come from the global layout. */
export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} Tu Parea — your team, your people, your
          sport.
        </span>
      </footer>
    </div>
  );
}
