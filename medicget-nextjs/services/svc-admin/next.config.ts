import path from 'path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

export default config;
