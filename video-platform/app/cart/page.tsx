'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getShopCoupons, Coupon } from '@/lib/supabase/coupons';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, updateSpecialRequests, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const total = items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);

  // Fetch coupons from the sellers of items in the cart
  useEffect(() => {
    if (items.length === 0) {
      setCoupons([]);
      return;
    }

    const sellerIds = [...new Set(items.map(i => i.sellerId))];

    const fetchCoupons = async () => {
      setLoadingCoupons(true);
      const allCoupons: Coupon[] = [];
      for (const sellerId of sellerIds) {
        const { data } = await getShopCoupons(sellerId);
        if (data) {
          allCoupons.push(...data);
        }
      }
      setCoupons(allCoupons);
      setLoadingCoupons(false);
    };

    fetchCoupons();
  }, [items]);

  const handleCheckout = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (items.length === 0) return;
    router.push('/checkout?source=cart');
  };

  return (
    <div className="min-h-screen bg-[#1A1A18] text-[#F5F0E8] pb-24">
      <div className="w-full px-4 lg:px-12 py-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/feed" className="text-[#9E9A90] hover:text-[#F5F0E8] mb-4 inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] rounded-lg">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-[#F5F0E8]">Shopping Cart</h1>
          {items.length > 0 && (
            <p className="text-[#9E9A90] text-sm mt-1">{items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-[#6BAF7A]/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <p className="text-[#9E9A90] mb-2 text-lg font-semibold">Your cart is empty</p>
            <p className="text-[#9E9A90]/70 text-sm mb-6">Browse local businesses and add items</p>
            <Link href="/feed" className="inline-block bg-[#F5A623] hover:bg-[#F5A623]/90 text-black font-semibold rounded-xl px-6 py-3 transition-colors active:scale-95">
              Browse Services
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="list-item-stagger bg-[#242420] border border-[#3A3A34] rounded-2xl p-4 hover:border-[#F5A623]/30 transition-all duration-200"
                >
                  <div className="flex gap-3">
                    {item.itemImage && (
                      <img
                        src={item.itemImage}
                        alt={item.itemName}
                        className="w-16 h-16 rounded-xl object-cover border border-[#3A3A34] flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#F5F0E8] font-semibold truncate">{item.itemName}</h3>
                      <p className="text-[#F5A623] font-bold">${(item.itemPrice * item.quantity).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.itemId)}
                      className="text-[#E05C3A] hover:text-[#E05C3A]/80 p-2 self-start rounded-lg hover:bg-[#E05C3A]/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
                      aria-label="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[#9E9A90] text-sm">Qty:</span>
                    <div className="flex items-center gap-0 bg-[#1A1A18] border border-[#3A3A34] rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="px-3 py-1.5 text-[#F5F0E8] hover:bg-[#2E2E28] disabled:text-[#9E9A90]/40 disabled:hover:bg-transparent transition-colors min-w-[44px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
                        aria-label="Decrease quantity"
                      >
                        &minus;
                      </button>
                      <span className="px-3 py-1.5 text-[#F5F0E8] font-medium min-w-[2rem] text-center border-x border-[#3A3A34]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                        className="px-3 py-1.5 text-[#F5F0E8] hover:bg-[#2E2E28] transition-colors min-w-[44px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {item.quantity > 1 && (
                      <span className="text-[#9E9A90] text-xs">${item.itemPrice.toFixed(2)} each</span>
                    )}
                  </div>

                  {/* Special requests */}
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Special requests (e.g. no onions, extra sauce...)"
                      value={item.specialRequests || ''}
                      onChange={(e) => updateSpecialRequests(item.itemId, e.target.value)}
                      className="w-full bg-[#1A1A18] border border-[#3A3A34] rounded-xl px-3 py-2 text-sm text-[#F5F0E8] placeholder-[#9E9A90]/50 focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/30 transition-colors"
                      aria-label="Special requests"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Available Coupons */}
            {!loadingCoupons && coupons.length > 0 && (
              <div className="bg-[#6BAF7A]/10 border border-[#6BAF7A]/30 rounded-2xl p-4 mb-6">
                <h2 className="text-lg font-semibold mb-3 text-[#F5F0E8]">Available Coupons</h2>
                <p className="text-[#9E9A90] text-xs mb-3">Coupons can be applied at checkout</p>
                <div className="space-y-2">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#6BAF7A]/30 bg-[#6BAF7A]/5"
                    >
                      <div>
                        <p className="font-semibold text-[#6BAF7A]">{coupon.code}</p>
                        <p className="text-[#9E9A90] text-sm">{coupon.discount_percentage}% off</p>
                      </div>
                      <span className="text-[#6BAF7A]/60 text-xs border border-[#6BAF7A]/30 px-2 py-1 rounded-lg">
                        Apply at checkout
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loadingCoupons && (
              <div className="bg-[#242420] border border-[#3A3A34] rounded-2xl p-4 mb-6 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#F5A623] mx-auto"></div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-[#242420] border border-[#3A3A34] rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[#9E9A90]">Total</span>
                <span className="text-xl font-bold text-[#F5A623]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                className="w-full bg-[#F5A623] hover:bg-[#F5A623]/90 text-black font-semibold py-3 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#F5A623]/20 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A18]"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={clearCart}
                className="w-full bg-[#242420] hover:bg-[#2E2E28] text-[#9E9A90] hover:text-[#F5F0E8] font-semibold py-3 rounded-xl transition-all duration-200 border border-[#3A3A34] min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
