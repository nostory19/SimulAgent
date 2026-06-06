import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SimulAgent',
  description: 'Real-time simultaneous interpretation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen" style={{ background: 'var(--bg)' }}>{children}</body>
    </html>
  );
}
