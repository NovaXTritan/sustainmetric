/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.mapillary.com" },
      { protocol: "https", hostname: "**.sentinel-hub.com" },
    ],
  },
  // Vercel handles env injection — no explicit env block needed
};

module.exports = nextConfig;
