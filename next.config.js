/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      // Include protected HTML files in the /api/serve/[slug] serverless bundle
      '/api/serve/[slug]': ['./protected-downloads/**/*'],
    },
  },
}

module.exports = nextConfig
