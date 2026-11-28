import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
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
  // Don't advertise the framework in a response header.
  poweredByHeader: false,
  images: {
    unoptimized: isDev,
    // Only hosts we actually serve images from. Local/plain-http hosts are for development only —
    // in production they would let the image optimiser be pointed at internal addresses.
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      ...(isDev
        ? ([
            { protocol: 'https', hostname: '*.trycloudflare.com' },
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'http', hostname: '127.0.0.1' },
            { protocol: 'http', hostname: 'backend' },
          ] as const)
        : []),
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Nobody may show our pages inside their own site (clickjacking / fake checkout overlays).
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Browsers only ever talk to us over HTTPS once they've seen this (ignored on http://localhost).
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Location is used for "use my location" at checkout; camera/mic are never needed.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com")' },
        ],
      },
    ];
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