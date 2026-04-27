import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Returns & Refunds',
  description:
    'How to return or exchange a Wig Century purchase, including timeframes, condition requirements and the refund process.',
  path: '/returns',
  keywords: ['wig returns', 'wig refund policy', 'return wig Ghana'],
});

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
