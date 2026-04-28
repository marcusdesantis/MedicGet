import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@medicget/shared'],
  experimental: {
    typedRoutes: false,
  },
};

export default config;
