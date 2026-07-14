import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Minimal self-contained server output, required for the Docker/Podman
  // runtime image (see Dockerfile).
  output: 'standalone',
  // with next@canary only
  // experimental: {
  //   ppr: 'incremental',
  // },
};

export default nextConfig;
