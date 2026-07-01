"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="error-page">
      <span className="error-page-code">500</span>
      <h1 className="error-page-title">Something went wrong</h1>
      <p className="error-page-msg">
        An unexpected error occurred. Try again or head back home.
      </p>
      <div className="error-page-actions">
        <button onClick={reset} className="error-page-cta">
          Try again
        </button>
        <a href="/" className="error-page-link">
          Back to home &rarr;
        </a>
      </div>
    </div>
  );
}
