import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '暗房 · 照片分析',
  description: '私密、证据化的本地照片分析工具',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
