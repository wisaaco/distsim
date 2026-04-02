import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DistSim',
    short_name: 'DistSim',
    description: 'Learn Distributed Systems by Building Them',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#22c55e',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
