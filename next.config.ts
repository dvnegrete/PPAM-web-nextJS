import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El panel habla con la API de NestJS; el proxy evita configurar CORS
  // y permite servir ambos detrás del mismo dominio en producción.
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3000'}/api/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
