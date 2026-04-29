import path from 'path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  /**
   * standalone — produces .next/standalone with a self-contained server.js
   * outputFileTracingRoot — tells Next.js to trace shared packages from the
   *   monorepo root so @medicget/shared is bundled correctly.
   */
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
};

export default config;
