import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Paksa module Node.js tidak di-bundle untuk client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        https:  false,
        http:   false,
        net:    false,
        tls:    false,
        fs:     false,
        crypto: false,
      }
    }
    return config
  },
}

export default nextConfig
