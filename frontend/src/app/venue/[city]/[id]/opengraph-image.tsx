import { ImageResponse } from "next/og";
import { cityBySlug } from "@/lib/cities";
import { getVenueWithReviews } from "@/lib/server/fetchers";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Watch the FIFA World Cup 2026";

// Branded social-share card per venue. Satori-safe: flex containers, single
// text node per leaf.
export default async function Image({
  params,
}: {
  params: { city: string; id: string };
}) {
  const city = cityBySlug(params.city);
  const data = await getVenueWithReviews(params.city, params.id);
  const name = data?.venue.name ?? "Watch the World Cup";

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
              fontSize: "30px",
              fontWeight: 700,
              color: "#f4a300",
              marginBottom: "16px",
            }}
          >
            Watch the World Cup in {city?.name ?? "your city"}
          </div>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 800 }}>
            {name}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "30px", color: "#cdeede" }}>
          FIFA World Cup 2026
        </div>
      </div>
    ),
    size,
  );
}
