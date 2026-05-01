'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const paymentSuccess = searchParams.get('payment_success');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderNumber) {
        setLoading(false);
        return;
      }

      try {
        const { data: orderData, error } = await supabase
          .from('orders')
          .select(`*, order_items (*)`)
          .eq('order_number', orderNumber)
          .single();

        if (error) throw error;
        setOrder(orderData);

        if (paymentSuccess === 'true' && orderData && orderData.payment_status !== 'paid') {
          verifyPayment(orderNumber, orderData);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderNumber, paymentSuccess]);

  const verifyPayment = async (orderNum: string, _initial: any) => {
    setVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { data: refreshed } = await supabase
      .from('orders')
      .select('*, order_items (*)')
      .eq('order_number', orderNum)
      .single();

    if (refreshed?.payment_status === 'paid') {
      setOrder(refreshed);
      setVerifying(false);
      return;
    }

    // Read the unique externalRef the checkout page stashed before
    // redirecting to Moolre. This is the ref Moolre indexed the
    // transaction under, so passing it makes /embed/status lookups
    // actually find the payment.
    let savedExternalRef: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        savedExternalRef = window.localStorage.getItem(`moolre_extref_${orderNum}`);
      } catch {
        savedExternalRef = null;
      }
    }

    try {
      const res = await fetch('/api/payment/moolre/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNum,
          ...(savedExternalRef ? { externalRef: savedExternalRef } : {}),
        }),
      });

      const result = await res.json();
      if (result.success && result.payment_status === 'paid') {
        const { data: updated } = await supabase
          .from('orders')
          .select('*, order_items (*)')
          .eq('order_number', orderNum)
          .single();
        if (updated) setOrder(updated);

        // Successfully verified — clean up the stored ref.
        if (savedExternalRef && typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(`moolre_extref_${orderNum}`);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Payment verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  /* ───────── LOADING ───────── */
  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">
            Loading your order…
          </p>
        </div>
      </main>
    );
  }

  /* ───────── NOT FOUND ───────── */
  if (!order) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
            <i className="ri-error-warning-line text-2xl text-red-500" />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-4">
            Order Not Found
          </p>
          <h1 className="font-serif italic text-3xl text-slate-900 mb-4 leading-tight">
            We couldn&apos;t<br />
            <span className="text-slate-300 font-light">locate it.</span>
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            Double-check the order link or get in touch and we&apos;ll find it for you.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-xl text-[11px] font-black tracking-[0.3em] uppercase transition-colors"
          >
            Return to Shop <i className="ri-arrow-right-line" />
          </Link>
        </div>
      </main>
    );
  }

  const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const estimatedDelivery = new Date(
    new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const pointsEarned = Math.floor((order.total || 0) / 10);
  const isPaid = order.payment_status === 'paid';

  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 right-0 w-[480px] h-[480px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px bg-blue-400" />
            <p className="text-[9px] font-black tracking-[0.55em] uppercase text-blue-400">
              {verifying
                ? 'Verifying payment'
                : isPaid
                ? 'Order confirmed'
                : 'Order placed'}
            </p>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3 mb-8">
            {verifying ? (
              <div className="w-12 h-12 rounded-2xl border border-blue-400/30 bg-blue-500/10 flex items-center justify-center">
                <i className="ri-loader-4-line text-blue-300 text-2xl animate-spin" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 flex items-center justify-center">
                <i className="ri-check-line text-emerald-300 text-2xl" />
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400">
                Reference
              </p>
              <p className="font-mono text-sm text-slate-200">{order.order_number}</p>
            </div>
          </div>

          {/* Headline */}
          <h1
            className="font-serif italic leading-[0.95] mb-6"
            style={{ fontSize: 'clamp(2.6rem, 6vw, 5.5rem)' }}
          >
            Thank you,<br />
            <span className="text-blue-300">
              {order.shipping_address?.firstName || 'friend'}.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
            {verifying
              ? "We're finalising your payment with Moolre. This page will update automatically — no need to refresh."
              : isPaid
              ? "We've received your payment and we're packing your order now. You'll get an email and SMS update at every step."
              : "We've received your order. Once payment is confirmed we'll start packing right away."}
          </p>

          {/* Stat strip */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-800/60 border border-slate-800 rounded-2xl overflow-hidden">
            <Stat label="Order" value={`#${order.order_number.split('-').slice(-1)[0]}`} />
            <Stat label="Placed" value={orderDate} />
            <Stat label="Estimated" value={estimatedDelivery} accent />
            <Stat
              label="Total"
              value={`GH₵ ${Number(order.total || 0).toFixed(2)}`}
            />
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={`/account?tab=orders`}
              className="group relative inline-flex items-center gap-3 bg-white text-slate-950 px-7 py-3.5 rounded-xl text-[11px] font-black tracking-[0.3em] uppercase overflow-hidden"
            >
              <span className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
              <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-300">
                View Order <i className="ri-arrow-right-line" />
              </span>
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-3 border border-white/20 hover:border-white/50 text-white px-7 py-3.5 rounded-xl text-[11px] font-black tracking-[0.3em] uppercase transition-colors"
            >
              Continue Shopping <i className="ri-shopping-bag-line" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-14 lg:py-20">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
          {/* LEFT: Items + Total */}
          <div className="lg:col-span-3">
            <SectionHeading eyebrow="Order Items" title="What you bought" />
            <ul className="divide-y divide-slate-100 mb-10">
              {order.order_items.map((item: any) => (
                <li key={item.id} className="py-5 flex items-start gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={item.metadata?.image || 'https://via.placeholder.com/150'}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg italic text-slate-900 leading-snug line-clamp-2">
                      {item.product_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        Qty {item.quantity}
                      </span>
                      {item.variant_name && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          {item.variant_name}
                        </span>
                      )}
                    </div>
                    {item.metadata?.preorder_shipping && (
                      <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-[10px] font-bold tracking-wider uppercase text-blue-700">
                        <i className="ri-time-line" />
                        {item.metadata.preorder_shipping}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 text-sm whitespace-nowrap">
                    GH₵ {Number(item.unit_price).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-6 space-y-3 max-w-md ml-auto">
              <Row label="Subtotal" value={`GH₵ ${Number(order.subtotal || 0).toFixed(2)}`} />
              <Row
                label="Shipping"
                value={
                  Number(order.shipping_total || 0) === 0
                    ? 'FREE'
                    : `GH₵ ${Number(order.shipping_total).toFixed(2)}`
                }
              />
              <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">
                  {isPaid ? 'Total Paid' : 'Total'}
                </span>
                <span className="font-serif italic text-2xl text-slate-900">
                  GH₵ {Number(order.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Delivery + What's next */}
          <div className="lg:col-span-2 space-y-12">
            {order.shipping_address && (
              <div>
                <SectionHeading eyebrow="Delivery" title="Going to" />
                <dl className="space-y-4 text-sm">
                  <Field
                    label="Recipient"
                    value={`${order.shipping_address.firstName || ''} ${order.shipping_address.lastName || ''}`.trim()}
                  />
                  <Field
                    label="Address"
                    value={
                      <>
                        {order.shipping_address.address}
                        <br />
                        {[order.shipping_address.city, order.shipping_address.region]
                          .filter(Boolean)
                          .join(', ')}
                        {order.shipping_address.postalCode && (
                          <>
                            <br />
                            {order.shipping_address.postalCode}
                          </>
                        )}
                      </>
                    }
                  />
                  <Field label="Phone" value={order.phone} />
                  <Field label="Email" value={order.email} />
                </dl>
              </div>
            )}

            <div>
              <SectionHeading eyebrow="What's next" title="The journey" />
              <ol className="relative border-l border-slate-200 ml-2 space-y-6 pl-6">
                <Step
                  icon="ri-mail-line"
                  title="Email Confirmation"
                  body={`Sent to ${order.email}`}
                  active
                />
                <Step
                  icon="ri-box-3-line"
                  title="Packing"
                  body="We'll prepare your order today."
                  active
                />
                <Step
                  icon="ri-truck-line"
                  title="Shipping"
                  body="You'll receive tracking via email and SMS."
                />
                <Step
                  icon="ri-home-smile-line"
                  title="Delivered"
                  body={`Estimated by ${estimatedDelivery}.`}
                />
              </ol>
            </div>
          </div>
        </div>

        {/* Loyalty card */}
        {pointsEarned > 0 && (
          <div className="mt-16 relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-2xl">
            <div className="absolute -top-24 -right-12 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 sm:p-10">
              <div className="flex items-start sm:items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                  <i className="ri-star-fill text-blue-300 text-2xl" />
                </div>
                <div>
                  <p className="text-[9px] font-black tracking-[0.5em] uppercase text-blue-300 mb-1">
                    Wig Century · Rewards
                  </p>
                  <p className="font-serif italic text-white text-2xl leading-tight">
                    You earned <span className="text-blue-300">{pointsEarned} points.</span>
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Redeem on your next order. Members get early access to new drops.
                  </p>
                </div>
              </div>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-3 bg-white text-slate-950 px-7 py-3.5 rounded-xl text-[11px] font-black tracking-[0.3em] uppercase hover:bg-blue-300 transition-colors"
              >
                Join Now <i className="ri-arrow-right-line" />
              </Link>
            </div>
          </div>
        )}

        {/* Help footer */}
        <div className="mt-16 pt-10 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-4">
            Need a hand?
          </p>
          <h3 className="font-serif italic text-2xl text-slate-900 mb-6">
            We&apos;re here for you.
          </h3>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[11px] font-black tracking-[0.25em] uppercase">
            <Link
              href="/contact"
              className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
            >
              <i className="ri-customer-service-line text-blue-500" /> Contact Support
            </Link>
            <Link
              href="/account?tab=orders"
              className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
            >
              <i className="ri-question-line text-blue-500" /> Order Help
            </Link>
            <Link
              href="/returns"
              className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5"
            >
              <i className="ri-arrow-left-right-line text-blue-500" /> Returns Policy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────── Subcomponents ───────────────── */

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-slate-950 px-5 py-5">
      <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-500 mb-1.5">
        {label}
      </p>
      <p
        className={`text-sm font-mono ${accent ? 'text-blue-300' : 'text-white'} truncate`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-2">
        {eyebrow}
      </p>
      <h2 className="font-serif italic text-2xl text-slate-900 leading-tight">{title}</h2>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-1">
        {label}
      </dt>
      <dd className="text-slate-900 leading-relaxed">{value}</dd>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
  active = false,
}: {
  icon: string;
  title: string;
  body: React.ReactNode;
  active?: boolean;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${
          active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <i className={`${icon} text-xs`} />
      </span>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-0.5">{body}</p>
    </li>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
