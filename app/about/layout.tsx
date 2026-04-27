import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About Wig Century',
  description:
    'Wig Century is a premium hair brand celebrating confidence, craftsmanship and authentic beauty. Meet the team behind the styles.',
  path: '/about',
  keywords: ['about Wig Century', 'wig brand Ghana', 'premium hair brand'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
