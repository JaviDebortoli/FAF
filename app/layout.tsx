import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'FAF Platform',
  description: 'Explainable streaming financial recommendations',
};

/**
 * Dark theme only, no toggle (design.md "Tailwind Adoption") — `dark` class
 * and `bg-black text-white` set the base palette; `@theme` in globals.css
 * supplies the semantic tokens layered on top.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
