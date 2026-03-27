import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker — produces minimal server.js + dependencies
  output: "standalone",

  // Transpile MDX package for server components
  transpilePackages: ["next-mdx-remote"],

  // Image optimization
  images: {
    // Allow images served from the NAS via our API route
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

  // Experimental features
  experimental: {
    // Server Actions enabled by default in Next.js 16
    serverActions: {
      bodySizeLimit: "10mb", // Allow photo uploads
    },
  },
};

export default nextConfig;
