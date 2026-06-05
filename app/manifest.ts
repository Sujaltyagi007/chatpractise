import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChatFlow',
    short_name: 'ChatFlow',
    description: 'A real-time chat application',
    start_url: '/',
    display: 'standalone',
    background_color: '#070709',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/globe.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
