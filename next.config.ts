import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile MDX package for server components
  transpilePackages: ["next-mdx-remote"],

  // Image optimization
  images: {
    // Allow images served from R2 via our proxied /api/images route
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thehudsonfam.com",
        pathname: "/api/images/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // Use sharp for WebP/AVIF optimization
    formats: ["image/avif", "image/webp"],
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Cache Components (Next.js 16): caching is explicit + opt-in. All dynamic
  // code runs at request time by default; cacheable work is marked with the
  // `'use cache'` directive (+ cacheLife/cacheTag). Also enables Partial
  // Prerendering — static shells stream dynamic holes wrapped in <Suspense>.
  cacheComponents: true,

  // Experimental features
  experimental: {
    // Server Actions enabled by default in Next.js 16
    serverActions: {
      bodySizeLimit: "10mb", // Allow photo uploads
    },
    // Persist Turbopack dev compiler artifacts to disk between restarts.
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
