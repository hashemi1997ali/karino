import type { NextConfig } from "next";

const apiServerUrl = (process.env.API_SERVER_URL ?? "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiServerUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
