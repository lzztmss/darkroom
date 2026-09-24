import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '暗房 · 照片分析',
  description: '私密、证据化的本地照片分析工具',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Browser translation extensions may add attributes before React hydrates.
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
