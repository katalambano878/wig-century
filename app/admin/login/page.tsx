'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { getToken, verifying } = useRecaptcha();

  // Live clock for the side panel — small "command centre" touch.
  const [time, setTime] = useState<string>('');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const isHuman = await getToken('admin_login');
    if (!isHuman) {
      setError('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (data.session) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
        document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
        router.push('/admin');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-white">
      {/* ── LEFT — editorial brand panel ───────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[48%] relative bg-slate-950 overflow-hidden">
        <Image
          src="/hero_portrait.jpg"
          alt=""
          fill
          priority
          quality={70}
          sizes="48vw"
          className="object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-950/85 to-blue-950/70" />

        {/* Subtle grid + radial glow */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-10 w-[360px] h-[360px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar */}
        <div className="relative z-10 w-full p-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="Wig Century"
              width={120}
              height={36}
              className="h-9 w-auto object-contain object-left drop-shadow-[0_4px_16px_rgba(59,130,246,0.45)]"
            />
          </Link>
          <div className="flex items-center gap-2 text-[9px] font-black tracking-[0.4em] uppercase text-blue-300/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            System Online
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 mt-auto p-10 pb-16">
          <p className="text-[9px] font-black tracking-[0.55em] uppercase text-blue-400 mb-5">
            Wig Century · Admin
          </p>
          <h1
            className="font-serif italic text-white leading-[0.95]"
            style={{ fontSize: 'clamp(2.6rem, 4.2vw, 4.5rem)' }}
          >
            Command<br />
            <span className="text-blue-300">Centre.</span>
          </h1>
          <p className="text-slate-300/80 text-sm font-light mt-6 max-w-sm leading-relaxed">
            Manage products, orders, customers and content. Everything that runs Wig Century, in one place.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[
              { label: 'Catalogue', icon: 'ri-stack-line' },
              { label: 'Orders', icon: 'ri-shopping-bag-3-line' },
              { label: 'Customers', icon: 'ri-team-line' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <i className={`${item.icon} text-blue-300 text-lg`} />
                </div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer strip — bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-10 py-5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
          <span>v1.0 · Secure</span>
          <span className="text-slate-400">{time} GMT</span>
        </div>
      </aside>

      {/* ── RIGHT — form panel ──────────────────────────────────────── */}
      <section className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 relative">
        {/* Mobile brand header */}
        <div className="lg:hidden mb-10 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Wig Century"
              width={140}
              height={42}
              className="h-9 w-auto object-contain object-left"
            />
          </Link>
          <span className="text-[9px] font-black tracking-[0.4em] uppercase text-blue-600">Admin</span>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Eyebrow + heading */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-blue-500" />
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-blue-600">Sign In</p>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 italic leading-tight mb-3">
              Welcome back,<br />
              <span className="text-slate-300 font-light">team.</span>
            </h2>
            <p className="text-sm text-slate-500 font-light">
              Use your staff or owner credentials to access the dashboard.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <i className="ri-error-warning-line text-red-500 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 text-[10px] font-black tracking-wide uppercase mb-0.5">
                  Login Failed
                </p>
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-7">
            {/* Email */}
            <div>
              <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300"
                placeholder="admin@wigcentury.com"
                autoComplete="username"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400">
                  Password
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[9px] font-bold tracking-wider uppercase text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading || verifying}
              className="group relative w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[11px] tracking-[0.3em] uppercase overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <span className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 group-disabled:translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isLoading || verifying ? (
                  <>
                    <i className="ri-loader-4-line animate-spin" />{' '}
                    {verifying ? 'Verifying…' : 'Signing In…'}
                  </>
                ) : (
                  <>
                    Access Dashboard <i className="ri-arrow-right-line" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Trust strip */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-[9px] font-bold tracking-[0.18em] uppercase text-slate-400">
            <div className="flex items-center gap-1.5">
              <i className="ri-shield-check-line text-blue-500" /> Encrypted
            </div>
            <div className="flex items-center gap-1.5">
              <i className="ri-fingerprint-line text-blue-500" /> reCAPTCHA
            </div>
            <div className="flex items-center gap-1.5">
              <i className="ri-time-line text-blue-500" /> Audit Log
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
            <Link
              href="/"
              className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1.5"
            >
              <i className="ri-arrow-left-line" /> Back to Store
            </Link>
            <span className="text-slate-300">© {new Date().getFullYear()} Wig Century</span>
          </div>
        </div>
      </section>
    </main>
  );
}
