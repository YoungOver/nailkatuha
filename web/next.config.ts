import type { NextConfig } from 'next'

const base = process.env.NEXT_BASE ?? ''

const nextConfig: NextConfig = {
  output: 'export',
  basePath: base,
  assetPrefix: base || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE: base },
}

export default nextConfig
