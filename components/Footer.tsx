"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCMS } from '@/context/CMSContext';

export default function Footer() {
  const { getSetting } = useCMS();
  const siteName = getSetting('site_name') || 'Wig Century';
  const siteTagline =
    getSetting('site_tagline') || 'Premium wigs, bundles & hair care — made for every crown.';

  const [showTop, setShowTop] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const COLS: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: 'Shop',
      links: [
        { href: '/shop', label: 'All Products' },
        { href: '/categories', label: 'Collections' },
        { href: '/shop?sort=newest', label: 'New Arrivals' },
        { href: '/shop?sale=true', label: 'On Sale' },
      ],
    },
    {
      title: 'Help',
      links: [
        { href: '/contact', label: 'Contact' },
        { href: '/order-tracking', label: 'Track Order' },
        { href: '/shipping', label: 'Shipping' },
        { href: '/returns', label: 'Returns' },
      ],
    },
    {
      title: 'About',
      links: [
        { href: '/about', label: 'Our Story' },
        { href: '/blog', label: 'Journal' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/terms', label: 'Terms' },
      ],
    },
  ];

  return (
    <footer className="relative mt-16 lg:mt-24 bg-slate-950 text-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
      <div className="absolute -bottom-20 right-[-10%] w-[380px] h-[380px] bg-blue-500/[0.06] rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-8">
        {/* Top row: brand + link columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 pb-12">
          {/* Brand */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-block group">
              <h3 className="font-serif text-2xl md:text-3xl tracking-tight group-hover:text-blue-300 transition-colors">
                {siteName}
              </h3>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{siteTagline}</p>
            <p className="text-[11px] font-black tracking-[0.35em] uppercase text-blue-400/80">
              Est. {year} · Accra, Ghana
            </p>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-black text-[11px] tracking-[0.3em] uppercase text-white mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-slate-400 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <span className="w-0 h-px bg-blue-400 group-hover:w-3 transition-all duration-300" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="border-t border-slate-800/70 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">
            &copy; {year} <span className="text-slate-300 font-semibold">{siteName}</span>. Powered By{' '}
            <a
              href="https://doctorbarns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 font-semibold hover:text-blue-400 transition-colors underline-offset-2 hover:underline"
            >
              Doctor Barns Tech
            </a>
            .
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="group inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] uppercase text-slate-500 hover:text-blue-400 transition-colors"
            >
              <i className="ri-shield-user-line text-sm" />
              <span>Admin</span>
            </Link>

            <div className="hidden sm:block w-px h-4 bg-slate-800" />

            <div className="flex items-center gap-2">
              {['ri-visa-line', 'ri-mastercard-line', 'ri-paypal-line', 'ri-smartphone-line'].map(
                (icon, i) => (
                  <div
                    key={i}
                    className="w-9 h-6 rounded-md bg-slate-900/60 border border-slate-800 flex items-center justify-center hover:border-blue-400/40 transition-colors"
                  >
                    <i className={`${icon} text-slate-400 text-sm`} />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back-to-top */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-white text-slate-950 shadow-xl flex items-center justify-center transition-all duration-500 hover:bg-blue-500 hover:text-white hover:scale-110 ${
          showTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <i className="ri-arrow-up-line text-lg" />
      </button>
    </footer>
  );
}
