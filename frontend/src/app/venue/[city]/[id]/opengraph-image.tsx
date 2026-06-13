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
              fontSize: "30px",
              fontWeight: 700,
              color: "#d97757",
              marginBottom: "16px",
            }}
          >
            Watch the World Cup in {city?.name ?? "your city"}
          </div>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 700 }}>
            {name}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "30px", color: "#e9ddd0" }}>
          FIFA World Cup 2026
        </div>
      </div>
    ),
    size,
  );
}
