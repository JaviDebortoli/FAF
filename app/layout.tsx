import type { ReactNode } from 'react';

export const metadata = {
  title: 'FAF Platform',
  description: 'Explainable streaming financial recommendations',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
