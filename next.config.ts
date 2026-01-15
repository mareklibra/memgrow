import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // with next@canary only
  // experimental: {
  //   ppr: 'incremental',
  // },
  typescript: {
    // Temporarily ignore TypeScript errors during build for Material Tailwind React compatibility
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
