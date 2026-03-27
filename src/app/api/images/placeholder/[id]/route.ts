import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  // Generate a simple SVG placeholder with the navy-gold palette
  const colors = [
    { bg: "#1a2232", fg: "#5b8dd9" },
    { bg: "#1a2232", fg: "#d4ad6a" },
    { bg: "#171d2a", fg: "#5b8dd9" },
    { bg: "#171d2a", fg: "#d4ad6a" },
    { bg: "#2a3345", fg: "#5b8dd9" },
    { bg: "#2a3345", fg: "#d4ad6a" },
  ];

  const index = (parseInt(id, 10) - 1) % colors.length;
  const color = colors[index] || colors[0];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${color.bg}"/>
    <text x="200" y="200" font-family="Georgia, serif" font-size="64" fill="${color.fg}" text-anchor="middle" dominant-baseline="central" opacity="0.3">HF</text>
    <text x="200" y="250" font-family="system-ui, sans-serif" font-size="14" fill="${color.fg}" text-anchor="middle" opacity="0.2">Photo ${id}</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
