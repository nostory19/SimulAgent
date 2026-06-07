import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'SimulAgent',
  description: 'Real-time simultaneous interpretation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="flex" style={{ background: '#fafbfc' }}>
        <Sidebar />
        <main className="flex-1 min-h-screen p-6 max-w-[960px]">
          {children}
        </main>
      </body>
    </html>
  );
}
