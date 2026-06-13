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
            "linear-gradient(125deg, #1c150f 0%, #3a271c 45%, #6e3f28 100%)",
          color: "#fbf3ea",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: "40px", fontWeight: 700, color: "#e0a44e" }}>
          FanWatch
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "34px",
              fontWeight: 700,
              color: "#d97757",
              marginBottom: "16px",
            }}
          >
            Where to watch the World Cup
          </div>
          <div style={{ display: "flex", fontSize: "96px", fontWeight: 700 }}>
            {city?.name ?? "Find your city"}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "30px", color: "#e9ddd0" }}>
          {city?.stadium?.name ?? "FIFA World Cup 2026"}
        </div>
      </div>
    ),
    size,
  );
}
