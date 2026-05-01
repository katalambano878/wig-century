'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const paymentSuccess = searchParams.get('payment_success');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
  }, []);

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
          verifyPayment(orderNumber);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderNumber, paymentSuccess]);

  const verifyPayment = async (orderNum: string) => {
    setVerifying(true);

    // Wait 3s for the callback to fire first
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

    try {
      const res = await fetch('/api/payment/moolre/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNum }),
      });
      const result = await res.json();
      if (result.success && result.payment_status === 'paid') {
        const { data: updated } = await supabase
          .from('orders')
          .select('*, order_items (*)')
          .eq('order_number', orderNum)
          .single();
        if (updated) setOrder(updated);
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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-slate-700 animate-spin mb-4 block" />
          <p className="text-gray-500 text-sm">Loading order details…</p>
        </div>
      </main>
    );
  }

  /* ───────── NOT FOUND ───────── */
  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
            <i className="ri-error-warning-line text-3xl text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn&apos;t locate the order details.</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
  const showLoyalty = !user && pointsEarned > 0;

  /* Status meta drives the hero badge + headline */
  const status = verifying
    ? {
        label: 'Verifying payment',
        title: 'Almost there…',
        copy: "We're confirming your payment with Moolre. This page will refresh automatically — no need to wait.",
        icon: 'ri-loader-4-line',
        spin: true,
        ring: 'bg-blue-50 border-blue-100',
        iconColor: 'text-blue-600',
      }
    : isPaid
      ? {
          label: 'Order confirmed',
          title: 'Order Confirmed!',
          copy: "Thank you for your purchase. We've received your payment and your order is now being prepared.",
          icon: 'ri-checkbox-circle-fill',
          spin: false,
          ring: 'bg-emerald-50 border-emerald-100',
          iconColor: 'text-emerald-600',
        }
      : {
          label: 'Order received',
          title: 'Order Placed',
          copy: "Thanks! We've received your order. Once payment is confirmed we'll start packing right away.",
          icon: 'ri-time-line',
          spin: false,
          ring: 'bg-amber-50 border-amber-100',
          iconColor: 'text-amber-600',
        };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* ── HERO CARD ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-100 p-8 md:p-12 text-center mb-8">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border ${status.ring} flex items-center justify-center mx-auto mb-6`}
            >
              <i
                className={`${status.icon} ${status.iconColor} text-5xl ${status.spin ? 'animate-spin' : ''}`}
              />
            </div>

            <p className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
              {status.label}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{status.title}</h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto mb-8">{status.copy}</p>

            {/* Stat strip */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 sm:p-6 mb-8">
              <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                <Stat label="Order" value={`#${order.order_number.split('-').slice(-1)[0]}`} />
                <Stat label="Placed" value={orderDate} />
                <Stat label="Estimated" value={estimatedDelivery} accent />
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link
                href={`/account?tab=orders`}
                className="bg-slate-900 hover:bg-slate-700 text-white px-7 py-3.5 rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <i className="ri-file-list-3-line" /> View Order
              </Link>
              <Link
                href="/shop"
                className="border border-slate-200 hover:border-slate-400 text-slate-700 px-7 py-3.5 rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <i className="ri-shopping-bag-line" /> Continue Shopping
              </Link>
            </div>

            {/* Loyalty / referral banner — only shown to guests */}
            {showLoyalty && (
              <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-4 sm:gap-6 text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <i className="ri-star-fill text-white text-2xl" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base sm:text-lg">
                      You earned {pointsEarned} {pointsEarned === 1 ? 'point' : 'points'}
                    </p>
                    <p className="text-sm text-gray-600">Create an account to redeem on your next order.</p>
                  </div>
                </div>
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap text-center"
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>

          {/* ── ITEMS + DELIVERY ──────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Order Items</h2>
                <span className="text-xs text-slate-400">
                  {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="space-y-4">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.metadata?.image || 'https://via.placeholder.com/150'}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                        {item.product_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        <span>Qty {item.quantity}</span>
                        {item.variant_name && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>{item.variant_name}</span>
                          </>
                        )}
                      </div>
                      {item.metadata?.preorder_shipping && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700">
                          <i className="ri-time-line" /> {item.metadata.preorder_shipping}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">
                      GH₵ {Number(item.unit_price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 mt-5 pt-4 space-y-2">
                <Row label="Subtotal" value={`GH₵ ${Number(order.subtotal || 0).toFixed(2)}`} />
                <Row
                  label="Shipping"
                  value={
                    Number(order.shipping_total || 0) === 0
                      ? 'FREE'
                      : `GH₵ ${Number(order.shipping_total).toFixed(2)}`
                  }
                />
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-slate-100 pt-3 mt-2">
                  <span>{isPaid ? 'Total Paid' : 'Total'}</span>
                  <span>GH₵ {Number(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Delivery + What's next */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Delivery Details</h2>

              {order.shipping_address && (
                <dl className="space-y-3.5 text-sm">
                  <Field
                    label="Recipient"
                    value={
                      `${order.shipping_address.firstName || ''} ${order.shipping_address.lastName || ''}`.trim() ||
                      '—'
                    }
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
              )}

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4">What&apos;s Next</h3>
                <ol className="relative border-l-2 border-slate-100 ml-2 pl-6 space-y-5">
                  <Step
                    icon="ri-mail-line"
                    title="Email Confirmation"
                    body={`Sent to ${order.email}`}
                    state={isPaid ? 'done' : 'current'}
                  />
                  <Step
                    icon="ri-box-3-line"
                    title="Processing"
                    body="We'll pack your order today."
                    state={isPaid ? 'current' : 'upcoming'}
                  />
                  <Step
                    icon="ri-truck-line"
                    title="Shipping"
                    body="Track via email & SMS."
                    state="upcoming"
                  />
                  <Step
                    icon="ri-home-smile-line"
                    title="Delivered"
                    body={`Estimated by ${estimatedDelivery}`}
                    state="upcoming"
                  />
                </ol>
              </div>
            </div>
          </div>

          {/* ── HELP FOOTER ──────────────────────────────────── */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-4">Need help with your order?</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link
                href="/contact"
                className="text-slate-700 hover:text-blue-600 font-semibold whitespace-nowrap inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                <i className="ri-customer-service-line" /> Contact Support
              </Link>
              <Link
                href="/account?tab=orders"
                className="text-slate-700 hover:text-blue-600 font-semibold whitespace-nowrap inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                <i className="ri-question-line" /> Order Help
              </Link>
              <Link
                href="/returns"
                className="text-slate-700 hover:text-blue-600 font-semibold whitespace-nowrap inline-flex items-center gap-1.5 text-sm transition-colors"
              >
                <i className="ri-arrow-left-right-line" /> Returns Policy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────── Subcomponents ───────────────── */

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-2 sm:px-3">
      <p className="text-[10px] sm:text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">
        {label}
      </p>
      <p
        className={`text-sm sm:text-base font-bold leading-tight truncate ${
          accent ? 'text-blue-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-gray-900 leading-relaxed font-medium text-sm">{value}</dd>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
  state,
}: {
  icon: string;
  title: string;
  body: React.ReactNode;
  state: 'done' | 'current' | 'upcoming';
}) {
  const styles =
    state === 'done'
      ? 'bg-emerald-500 text-white'
      : state === 'current'
        ? 'bg-blue-600 text-white'
        : 'bg-slate-100 text-slate-400';
  return (
    <li className="relative">
      <span
        className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full ring-4 ring-white flex items-center justify-center ${styles}`}
      >
        <i className={`${icon} text-[11px]`} />
      </span>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-0.5">{body}</p>
    </li>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-12 h-12 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
