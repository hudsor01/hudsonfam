import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "The Hudson Family",
    template: "%s | The Hudson Family",
  },
  description: "Photos and memories from our corner of the world",
  metadataBase: new URL("https://thehudsonfam.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thehudsonfam.com",
    siteName: "The Hudson Family",
    title: "The Hudson Family",
    description: "Photos and memories from our corner of the world",
  },
  twitter: {
    card: "summary",
    title: "The Hudson Family",
    description: "Photos and memories from our corner of the world",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans antialiased min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
