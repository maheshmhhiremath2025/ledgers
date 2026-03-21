/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'pdfkit'],
  },
  images: {
    domains: [],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfkit needs these Node.js built-ins to not be bundled
      config.externals = [...(config.externals || []), 'pdfkit']
    }
    return config
  },
}

module.exports = nextConfig