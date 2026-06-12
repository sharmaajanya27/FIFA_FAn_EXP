import { ImageResponse } from "next/og";
import { cityBySlug } from "@/lib/cities";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Where to watch the FIFA World Cup 2026";

// Branded social-share card per city. Satori-safe: every container is flex and
// every leaf holds a single text node.
export default function Image({ params }: { params: { city: string } }) {
  const city = cityBySlug(params.city);
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(125deg, #06140d 0%, #0c3b27 45%, #0a6b41 100%)",
          color: "#eafff4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "40px", fontWeight: 800, color: "#0aa15a" }}>
          FanWatch
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "34px",
              fontWeight: 700,
              color: "#f4a300",
              marginBottom: "16px",
            }}
          >
            Where to watch the World Cup
          </div>
          <div style={{ display: "flex", fontSize: "96px", fontWeight: 800 }}>
            {city?.name ?? "Find your city"}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "30px", color: "#cdeede" }}>
          {city?.stadium?.name ?? "FIFA World Cup 2026"}
        </div>
      </div>
    ),
    size,
  );
}
