"use client";

/**
 * Global error boundary — catches errors in the ROOT layout itself.
 * Must render its own <html>/<body> since the layout may be broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tu Parea — Error</title>
        <style>{`
          :root {
            --paper: #f7eeda;
            --ink: #241b12;
            --accent: #ff5436;
            --accent-deep: #e23a2e;
            --muted: #6e6047;
          }
          * { box-sizing: border-box; margin: 0; }
          body {
            font-family: -apple-system, "Segoe UI", Roboto, Helvetica, sans-serif;
            background: var(--paper);
            color: var(--ink);
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .wrap {
            text-align: center;
            max-width: 420px;
          }
          .code {
            font-size: clamp(64px, 12vw, 120px);
            font-weight: 900;
            color: var(--accent);
            line-height: 1;
          }
          h1 {
            font-size: clamp(20px, 4vw, 28px);
            margin: 12px 0 8px;
          }
          p {
            color: var(--muted);
            margin-bottom: 24px;
          }
          button, a {
            display: inline-block;
            padding: 12px 28px;
            border-radius: 5px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
          }
          button {
            background: var(--accent);
            color: #fff;
            border: none;
            margin-right: 12px;
          }
          button:hover { background: var(--accent-deep); }
          a { color: var(--ink); border: 1.5px solid var(--ink); }
          a:hover { background: var(--ink); color: var(--paper); }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <span className="code">500</span>
          <h1>Something went wrong</h1>
          <p>A critical error occurred. Try reloading or head back home.</p>
          <button onClick={reset}>Try again</button>
          <a href="/">Back to home</a>
        </div>
      </body>
    </html>
  );
}
