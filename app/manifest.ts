import type { MetadataRoute } from 'next'

// Lets Android "Add to Home screen" open Bajan like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'বাজান (Bajan)',
    short_name: 'বাজান',
    description: 'বাংলায় কথা বলার সহকারী — Bangla voice companion',
    lang: 'bn',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f7f6',
    theme_color: '#00573f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
