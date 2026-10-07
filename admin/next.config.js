/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: true, // required for static export
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};
module.exports = nextConfig;
