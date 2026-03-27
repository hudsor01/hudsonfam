import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#171d2a",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <span style={{ color: "#d4ad6a", fontSize: 20, fontWeight: 700 }}>
          H
        </span>
      </div>
    ),
    { ...size }
  );
}
