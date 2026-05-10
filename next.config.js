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
      '/api/serve': ['./protected-downloads/**/*'],
    },
  },
}

module.exports = nextConfig
