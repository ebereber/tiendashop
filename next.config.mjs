/** @type {import('next').NextConfig} */
// next.config.ts / next.config.mjs
const nextConfig = {
  cacheComponents: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "7zp9cjdq-3000.brs.devtunnels.ms",
        "*.devtunnels.ms",
      ],
    },
  },
  images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.mitiendanube.com",
    },
  ],
},
};

export default nextConfig
