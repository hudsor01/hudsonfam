import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "The Hudson Family",
    template: "%s | The Hudson Family",
  },
  description: "Stories, photos, and life updates from our corner of the world",
  metadataBase: new URL("https://thehudsonfam.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thehudsonfam.com",
    siteName: "The Hudson Family",
    title: "The Hudson Family",
    description: "Stories, photos, and life updates from our corner of the world",
  },
  twitter: {
    card: "summary",
    title: "The Hudson Family",
    description: "Stories, photos, and life updates from our corner of the world",
  },
  alternates: {
    types: {
      "application/rss+xml": "/api/blog/rss",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="bg-bg text-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
