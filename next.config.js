/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features
  experimental: {
    serverActions: true,
  },
  
  // Image domains for external images
  images: {
    domains: [
      'cdn.flowatgenai.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'www.gravatar.com',
    ],
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle node-specific modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Environment variables available on client
  env: {
    NEXT_PUBLIC_APP_NAME: 'FlowAtGenAi',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
