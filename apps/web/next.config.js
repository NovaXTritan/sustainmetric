/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.mapillary.com" },
      { protocol: "https", hostname: "**.sentinel-hub.com" },
    ],
  },
};

module.exports = nextConfig;
