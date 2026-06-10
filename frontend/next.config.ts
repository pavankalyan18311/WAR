import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 'standalone' is for Docker/self-hosting — Vercel handles its own output
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        // Supabase Storage
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        // Supabase Storage (custom domains)
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
};

export default nextConfig;

