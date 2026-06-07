import './globals.css';
import type { Metadata } from 'next';
import { ClientLayout } from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'SimulAgent',
  description: 'Real-time simultaneous interpretation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body style={{ background: '#fafbfc' }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
