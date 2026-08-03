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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
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
  async headers() {
    return [
      {
        source: "/:path*.(jpg|jpeg|png|webp|avif|svg|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
