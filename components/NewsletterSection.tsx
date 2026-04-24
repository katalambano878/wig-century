"use client";

import { useState } from 'react';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitStatus('success');
      setEmail('');
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Card container */}
        <div className="relative bg-stone-950 rounded-3xl overflow-hidden px-6 sm:px-10 lg:px-16 py-8 md:py-10">

          {/* Decorative elements */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-stone-800/50 rounded-full blur-3xl pointer-events-none" />

          {/* Film grain */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          <div className="relative z-10">
            {/* Top: centered content */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="w-5 h-px bg-amber-400/60" />
                <span className="text-amber-400/80 text-[9px] font-black tracking-[0.5em] uppercase">Stay in the Loop</span>
                <span className="w-5 h-px bg-amber-400/60" />
              </div>

              {/* Heading */}
              <h2 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] text-white leading-[1.15] tracking-tight mb-4">
                Get Exclusive Drops &{' '}
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                  10% Off
                </span>
              </h2>

              <p className="text-stone-500 text-sm md:text-base font-light leading-relaxed max-w-md mx-auto">
                Be first to know about new thrift finds, restocks and member-only deals. No spam — just style, straight to your inbox.
              </p>
            </div>

            {/* Form */}
            {submitStatus === 'success' ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center">
                  <i className="ri-checkbox-circle-fill text-amber-400 text-xl" />
                </div>
                <p className="text-white text-lg font-serif font-semibold">You're in!</p>
                <p className="text-stone-500 text-sm">Check your inbox — your 10% code is on its way.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-sm" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3.5 bg-stone-900 border border-stone-800 rounded-xl text-white placeholder:text-stone-700 text-sm font-medium focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all duration-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group inline-flex items-center justify-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 px-7 py-3.5 rounded-xl font-black text-[11px] tracking-[0.25em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(245,158,11,0.2)] whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <><i className="ri-loader-4-line animate-spin text-sm" /> Joining…</>
                    ) : (
                      <>
                        Subscribe
                        <i className="ri-arrow-right-line text-xs group-hover:translate-x-0.5 transition-transform duration-200" />
                      </>
                    )}
                  </button>
                </div>

                {submitStatus === 'error' && (
                  <p className="text-red-400 text-xs flex items-center justify-center gap-2 mt-3">
                    <i className="ri-error-warning-line" /> Something went wrong. Please try again.
                  </p>
                )}

                {/* Trust signals */}
                <div className="flex items-center justify-center gap-6 mt-5">
                  {[
                    { icon: 'ri-mail-check-line', label: 'No spam, ever' },
                    { icon: 'ri-lock-line', label: 'Unsubscribe anytime' },
                    { icon: 'ri-gift-line', label: '10% off first order' },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-1.5 text-stone-600 text-[10px]">
                      <i className={`${t.icon} text-xs`} />
                      <span className="font-medium tracking-wide">{t.label}</span>
                    </div>
                  ))}
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
