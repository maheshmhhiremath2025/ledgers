/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  // Allow images from any domain for logo uploads
  images: {
    domains: [],
  },
}

module.exports = nextConfig
