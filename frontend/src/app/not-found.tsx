import Link from "next/link";

export default function NotFound() {
  return (
    <div className="error-page">
      <span className="error-page-code">404</span>
      <h1 className="error-page-title">Page not found</h1>
      <p className="error-page-msg">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
      </p>
      <Link href="/" className="error-page-cta">
        Back to the match &rarr;
      </Link>
    </div>
  );
}
