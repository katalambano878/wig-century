'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCMS } from '@/context/CMSContext';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AboutPage() {
  usePageTitle('Our Story');
  const { getSetting } = useCMS();
  const [activeTab, setActiveTab] = useState('story');

  const siteName = getSetting('site_name') || 'Wig Century';

  const values = [
    {
      icon: 'ri-verified-badge-line',
      title: 'Curated Quality',
      description: 'Every wig and bundle is chosen and checked before it ships — so you can shop with confidence.'
    },
    {
      icon: 'ri-money-dollar-circle-line',
      title: 'Great Prices',
      description: 'Premium looks without the premium stress. We focus on value so you can switch styles more often.'
    },
    {
      icon: 'ri-scissors-cut-line',
      title: 'Styles You Will Wear',
      description: 'From everyday units to statement lengths — a mix of textures and caps to match your routine.'
    },
    {
      icon: 'ri-customer-service-2-line',
      title: 'Here to Help',
      description: 'Questions about fit, care, or your order? Reach out through the form on our contact page anytime.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-slate-950 overflow-hidden" style={{ minHeight: '72vh' }}>
        <Image
          src="/hero_salon.jpg"
          alt="Our Story"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={82}
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

        {/* Ghost letter */}
        <div
          aria-hidden="true"
          className="absolute -left-6 bottom-0 font-serif italic text-white/[0.03] leading-none pointer-events-none select-none"
          style={{ fontSize: 'clamp(12rem, 30vw, 28rem)' }}
        >O</div>

        <div
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center"
          style={{ minHeight: '72vh' }}
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-px bg-blue-400" />
            <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">Who We Are</span>
          </div>

          <h1 className="font-serif italic leading-[0.95] drop-shadow-xl">
            <span className="block text-white" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Our</span>
            <span className="block text-blue-400 drop-shadow-md" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Story</span>
            <span className="block text-white/90 mt-2 font-medium" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>Your Hair</span>
          </h1>

          <p className="text-slate-100 text-base md:text-lg font-normal mt-8 max-w-sm leading-relaxed drop-shadow-md">
            Wigs, bundles, and hair care — curated for you at Wig Century.
          </p>
        </div>
      </section>

      {/* ── TABS NAV ─────────────────────────────────────── */}
      <div className="relative z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex justify-center gap-4">
            {[
              { key: 'story',   label: 'Our Story' },
              { key: 'mission', label: 'Mission & Vision' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-[10px] font-black tracking-[0.35em] uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">

        {activeTab === 'story' && (
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Text */}
            <div className="order-2 md:order-1">
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-5">Wig Century</p>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] text-slate-900 mb-10 leading-[1.05]">
                How It All <span className="font-serif italic font-light text-slate-400">Started</span>
              </h2>
              <div className="space-y-6 text-slate-500 text-base font-light leading-[1.85] border-l-2 border-slate-100 pl-6">
                <p>
                  <strong className="text-slate-900 font-semibold">{siteName}</strong> started with a simple idea: make it easier to find wigs and hair you actually want to wear — without the guesswork.
                </p>
                <p>
                  From lace fronts and glueless units to bundles and everyday care, every product is chosen with quality and wearability in mind. We believe great hair should feel within reach.
                </p>
                <p>
                  Whether you are trying a new look, restocking a favourite, or building an install kit, <strong className="text-slate-900 font-semibold">{siteName}</strong> is here to help you feel confident from checkout to unboxing.
                </p>
              </div>
            </div>

            {/* Logo / image */}
            <div className="relative order-1 md:order-2 group">
              <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                <img
                  src="/hero_duo.jpg"
                  alt="Wig Century"
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000 ease-[cubic-bezier(0.25,0.1,0.25,1)] relative z-10"
                />
              </div>
              <div className="absolute -z-10 -bottom-6 -right-6 w-full h-full bg-slate-100/80 group-hover:-translate-y-2 group-hover:-translate-x-2 transition-transform duration-700" />
            </div>
          </div>
        )}

        {activeTab === 'mission' && (
          <div className="grid md:grid-cols-2 gap-4">

            {/* Mission */}
            <div className="bg-slate-950 p-10 rounded-2xl relative overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute -right-4 -bottom-8 font-serif italic text-white/[0.04] leading-none pointer-events-none select-none"
                style={{ fontSize: '10rem' }}
              >M</div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-8">
                <i className="ri-focus-3-line text-2xl text-blue-400" />
              </div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-blue-400 mb-3">Mission</p>
              <h3 className="font-serif text-3xl italic text-white mb-5">Statement</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                To provide quality wigs, bundles, and hair care at fair prices — making it simpler for everyone to find styles they love.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-blue-950 p-10 rounded-2xl relative overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute -right-4 -bottom-8 font-serif italic text-white/[0.04] leading-none pointer-events-none select-none"
                style={{ fontSize: '10rem' }}
              >V</div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-8">
                <i className="ri-eye-line text-2xl text-blue-400" />
              </div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-blue-400 mb-3">Vision</p>
              <h3 className="font-serif text-3xl italic text-white mb-5">Statement</h3>
              <p className="text-blue-100/60 leading-relaxed text-sm">
                To be a trusted destination for wigs and hair — known for variety, honest quality, and a smooth shopping experience.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── VALUES ───────────────────────────────────────── */}
      <div className="bg-slate-950 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-4">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-blue-400 mb-3">The Foundation</p>
              <h2 className="font-serif text-4xl lg:text-5xl italic text-white leading-[1.05]">
                Why Shop<br />
                <span className="text-white/20">With Us?</span>
              </h2>
            </div>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed sm:text-right">
              Trusted by shoppers who care about how their hair looks and feels.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800">
            {values.map((value, i) => (
              <div key={i} className="bg-slate-950 p-8 group hover:bg-slate-900 transition-colors duration-200">
                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-600 mb-6">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div className="w-10 h-10 rounded-lg bg-slate-900 group-hover:bg-slate-800 flex items-center justify-center mb-6 transition-colors">
                  <i className={`${value.icon} text-xl text-blue-400`} />
                </div>
                <h3 className="font-serif text-xl italic text-white mb-3">{value.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────── */}
      <div className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-3">Ready?</p>
              <h2 className="font-serif text-4xl lg:text-5xl text-slate-900 italic leading-[1.05]">
                Shop Smarter,<br />
                <span className="text-slate-300">Not Harder.</span>
              </h2>
              <p className="text-slate-400 text-sm font-light mt-5 max-w-sm leading-relaxed">
                Browse wigs, bundles, and care essentials — new styles arrive regularly.
              </p>
            </div>
            <Link
              href="/shop"
              className="flex-shrink-0 inline-flex items-center gap-3 bg-slate-900 hover:bg-slate-700 text-white px-10 py-5 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors"
            >
              Start Shopping <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
