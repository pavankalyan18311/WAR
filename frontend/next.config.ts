import type { NextConfig } from 'next';

const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:8000';
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Silence workspace root lockfile warning in Next.js 16
  turbopack: {
    root: __dirname,
  },
  // Allow ephemeral Cloudflare tunnel hosts in dev so no config edits are needed per run.
  allowedDevOrigins: ['*.trycloudflare.com', ...extraDevOrigins],
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
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
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: '*.trycloudflare.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'backend',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;