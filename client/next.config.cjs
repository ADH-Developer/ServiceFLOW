/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure we can communicate with our Django backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://server:8000/api/:path*'
      },
      {
        source: '/login',
        destination: 'http://server:8000/api/customers/login/'
      }
    ]
  },
  // Configure webpack if needed
  webpack: (config, { isServer }) => {
    // Add any custom webpack config here
    return config
  },
  // Disable server-side generation since we're using Django backend
  typescript: {
    ignoreBuildErrors: false
  }
};

module.exports = nextConfig;
