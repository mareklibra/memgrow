import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Minimal self-contained server output for the Docker/Podman runtime
  // image (see Dockerfile). Skip on Vercel: Next 16.3 no longer emits
  // next-server.js.nft.json when the Vercel adapter is present, so
  // standalone + onBuildComplete fails with ENOENT
  // (https://github.com/vercel/next.js/issues/96646). Vercel ignores
  // the standalone directory anyway.
  output: process.env.VERCEL ? undefined : 'standalone',
  // with next@canary only
  // experimental: {
  //   ppr: 'incremental',
  // },
};

export default nextConfig;
