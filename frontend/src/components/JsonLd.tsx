/**
 * Renders a schema.org JSON-LD block. Server-safe (no client JS). Accepts one
 * object or an array; pass the output of the builders in lib/seo.ts.
 */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is safe to inline; escape `<` to be defensive.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
