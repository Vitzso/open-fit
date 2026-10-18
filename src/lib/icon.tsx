import { ImageResponse } from "next/og";

/** App icon rendered at build/request time, so no binary assets live in the repo. */
export function renderIcon(size: number) {
  const s = size / 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #10b981 0%, #047857 100%)",
        }}
      >
        {/* Stylised dumbbell */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 44 * s, height: 190 * s, background: "#09090b", borderRadius: 18 * s }} />
          <div style={{ width: 30 * s, height: 130 * s, background: "#09090b", borderRadius: 12 * s, marginLeft: 10 * s }} />
          <div style={{ width: 150 * s, height: 36 * s, background: "#09090b" }} />
          <div style={{ width: 30 * s, height: 130 * s, background: "#09090b", borderRadius: 12 * s }} />
          <div style={{ width: 44 * s, height: 190 * s, background: "#09090b", borderRadius: 18 * s, marginLeft: 10 * s }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
