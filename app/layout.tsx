import type { ReactNode } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

export const metadata = {
  title: 'FAF Platform',
  description: 'Explainable streaming financial recommendations',
};

/**
 * Two-family type system (dashboard-ux design direction): a restrained sans
 * for labels/headings/prose and a monospace face for every numeric/data
 * value (sigma, gamma, rho, prices, timestamps) so tabular figures read like
 * instrument-panel readouts, not marketing copy. Exposed as CSS variables
 * consumed by `@theme` in globals.css (`--font-sans`, `--font-mono`).
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

/**
 * Dark theme only, no toggle (design.md "Tailwind Adoption") — `dark` class
 * and `bg-black text-white` set the base palette; `@theme` in globals.css
 * supplies the semantic tokens layered on top.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`dark ${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-black font-sans text-white antialiased">{children}</body>
    </html>
  );
}
