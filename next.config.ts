import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/images/**",
      },
      {
        protocol: "http",
        hostname: "assets.myntassets.com",
        pathname: "/v1/images/**",
      },
      {
        protocol: "https",
        hostname: "assets.myntassets.com",
        pathname: "/v1/images/**",
      },
      {
        // Supabase Storage CDN
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google profile avatars (NextAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;