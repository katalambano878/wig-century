'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function WishlistPage() {
  usePageTitle('Wishlist');
  const { wishlist: wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const addAllToCart = () => {
    const inStockItems = wishlistItems.filter(item => item.inStock);
    inStockItems.forEach(item => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        slug: item.slug || item.id,
        maxStock: 99
      });
    });
    if (inStockItems.length > 0) {
      alert(`Added ${inStockItems.length} items to cart`);
    }
  };

  return (
    <main className="min-h-screen bg-white">

      {/* ── HERO BANNER ──────────────────────────────────── */}
      <section className="relative bg-stone-950 overflow-hidden" style={{ minHeight: '42vh' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

        {/* Ghost letter */}
        <div
          aria-hidden="true"
          className="absolute -right-4 bottom-0 font-serif italic text-white/[0.04] leading-none pointer-events-none select-none"
          style={{ fontSize: 'clamp(8rem, 22vw, 20rem)' }}
        >W</div>

        <div
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center"
          style={{ minHeight: '42vh' }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-px bg-amber-400" />
            <span className="text-amber-400 text-[9px] font-black tracking-[0.55em] uppercase">Saved Items</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <h1 className="font-serif italic text-white leading-[0.9]" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>
              My<br />
              <span className="text-amber-400">Wishlist</span>
            </h1>

            {wishlistItems.length > 0 && (
              <div className="flex items-center gap-4 pb-1">
                <span className="text-stone-500 text-sm">
                  <span className="text-white font-bold">{wishlistItems.length}</span> {wishlistItems.length === 1 ? 'item' : 'items'} saved
                </span>
                <button
                  onClick={addAllToCart}
                  className="inline-flex items-center gap-2 bg-white hover:bg-amber-400 text-stone-900 px-5 py-2.5 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-colors"
                >
                  Add All to Cart <i className="ri-shopping-cart-line" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── BREADCRUMB STRIP ─────────────────────────────── */}
      <div className="border-b border-stone-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs text-stone-400">
            <Link href="/" className="hover:text-stone-700 transition-colors">Home</Link>
            <i className="ri-arrow-right-s-line" />
            <span className="text-stone-700 font-semibold">Wishlist</span>
          </nav>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────── */}
      {wishlistItems.length === 0 ? (

        /* ── EMPTY STATE ── */
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-24 px-4">
          <div className="w-20 h-20 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center mb-6">
            <i className="ri-heart-line text-3xl text-stone-300" />
          </div>
          <h2 className="font-serif text-3xl italic text-stone-900 mb-3">Your wishlist is empty</h2>
          <p className="text-stone-400 text-sm max-w-xs mb-8 leading-relaxed">
            Save your favourite items here to easily find them later.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-stone-900 hover:bg-stone-700 text-white px-8 py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors"
          >
            Explore Products <i className="ri-arrow-right-line" />
          </Link>
        </div>

      ) : (

        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <div className="flex items-end justify-between mb-10 pb-6 border-b border-stone-100">
              <div>
                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-stone-300 mb-1">Your Picks</p>
                <h2 className="font-serif text-3xl italic text-stone-900">
                  Saved Items <span className="text-stone-300 font-light">({wishlistItems.length})</span>
                </h2>
              </div>
              <button
                onClick={addAllToCart}
                className="hidden sm:inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-700 text-white px-6 py-3 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-colors"
              >
                Add All to Cart <i className="ri-shopping-cart-line" />
              </button>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistItems.map((product) => (
                <div key={product.id} className="relative group">
                  <ProductCard {...product} slug={product.slug || product.id} />
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md hover:bg-red-50 hover:text-red-500 text-stone-500 transition-all z-10 opacity-0 group-hover:opacity-100"
                    title="Remove from wishlist"
                  >
                    <i className="ri-close-line text-sm" />
                  </button>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ── SHARE SECTION ────────────────────────────────── */}
      <section className="bg-stone-950 py-16 mt-8">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-amber-400 mb-3">Spread the Love</p>
              <h2 className="font-serif text-3xl lg:text-4xl italic text-white leading-tight">
                Share Your<br />
                <span className="text-white/20">Wishlist</span>
              </h2>
              <p className="text-stone-500 text-sm mt-4 max-w-xs leading-relaxed">
                Let friends and family know what you love.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {[
                { icon: 'ri-facebook-fill',  label: 'Facebook' },
                { icon: 'ri-twitter-x-fill', label: 'Twitter'  },
                { icon: 'ri-whatsapp-fill',  label: 'WhatsApp' },
                { icon: 'ri-mail-fill',      label: 'Email'    },
              ].map(s => (
                <button
                  key={s.label}
                  title={s.label}
                  className="w-12 h-12 flex items-center justify-center bg-stone-800 hover:bg-amber-400 text-stone-400 hover:text-stone-900 rounded-xl transition-all duration-200"
                >
                  <i className={`${s.icon} text-xl`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
