/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: true
  },
  webpack: (config, { isServer }) => {
    // Handle ESM modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
      };
    }
    return config;
  },
  // Rewrite API requests to the Django backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://server:8000/api/:path*'
      },
      {
        source: '/workflow/:path*',
        destination: 'http://server:8000/workflow/:path*'
      },
      {
        source: '/login',
        destination: 'http://server:8000/api/customers/login/'
      }
    ];
  },
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false
  }
};

module.exports = nextConfig; 