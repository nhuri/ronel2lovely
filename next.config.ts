import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dhfhcoivkbhltboeqauc.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Registration submits up to 3 profile photos as FormData through a server
      // action. Client-side compression can silently fall back to the original,
      // uncompressed phone-camera file (see src/lib/compress-image.ts), so the
      // default ~1MB body limit was getting exceeded and silently failing.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
