import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aberpack-photos-bucket.s3.us-east-1.amazonaws.com",
        pathname: "/avatars/**",
      },
    ],
  },
};

export default nextConfig;
