'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { getShopCoupons, Coupon } from '@/lib/supabase/coupons';
import Link from 'next/link';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = searchParams.get('source');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (source === 'cart') {
      // Coming from cart page
      setCheckoutItems(cartItems);
    } else {
      // Coming from Buy Now - single item from URL params
      const itemId = searchParams.get('itemId');
      const itemName = searchParams.get('itemName');
      const itemPrice = searchParams.get('itemPrice');
      const sellerId = searchParams.get('sellerId');
      const buyerId = searchParams.get('buyerId');
      const itemImage = searchParams.get('itemImage') || undefined;

      if (itemId && itemName && itemPrice && sellerId && buyerId) {
        setCheckoutItems([{
          itemId,
          itemName,
          itemPrice: parseFloat(itemPrice),
          itemImage,
          sellerId,
          buyerId,
          quantity: 1,
        }]);
      }
    }
    setLoading(false);
  }, [user, source, searchParams, cartItems, router]);

  // Get unique seller IDs and fetch their coupons
  useEffect(() => {
    if (checkoutItems.length === 0) return;

    const sellerIds = [...new Set(checkoutItems.map(i => i.sellerId))];

    const fetchCoupons = async () => {
      const allCoupons: Coupon[] = [];
      for (const sellerId of sellerIds) {
        const { data } = await getShopCoupons(sellerId);
        if (data) {
          allCoupons.push(...data);
        }
      }
      setCoupons(allCoupons);
    };

    fetchCoupons();
  }, [checkoutItems]);

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);

  const discountAmount = selectedCoupon
    ? Math.round(subtotal * (selectedCoupon.discount_percentage / 100) * 100) / 100
    : 0;

  const total = Math.max(0, subtotal - discountAmount);

  const handleProceedToPayment = async () => {
    if (checkoutItems.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: checkoutItems.map((item) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            itemPrice: item.itemPrice,
            itemImage: item.itemImage,
            sellerId: item.sellerId,
            buyerId: item.buyerId,
            quantity: item.quantity,
            specialRequests: item.specialRequests,
          })),
          couponCode: selectedCoupon?.code || null,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.url) {
        // Clear cart if coming from cart
        if (source === 'cart') {
          clearCart();
        }
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-transparent text-white p-4">
        <div className="w-full px-4 lg:px-12 text-center py-16">
          <p className="text-white/60 mb-4">No items to checkout</p>
          <Link href="/feed" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg px-6 py-2 transition-colors">
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-4">
      <div className="w-full px-4 lg:px-12">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        {/* Order Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
          <div className="space-y-3">
            {checkoutItems.map((item) => (
              <div key={item.itemId} className="flex items-center gap-3">
                {item.itemImage && (
                  <img
                    src={item.itemImage}
                    alt={item.itemName}
                    className="w-12 h-12 rounded-lg object-cover border border-white/20"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.itemName}</p>
                  {item.quantity > 1 && (
                    <p className="text-white/40 text-xs">x{item.quantity} @ ${item.itemPrice.toFixed(2)}</p>
                  )}
                  {item.specialRequests && (
                    <p className="text-yellow-400/70 text-xs mt-0.5">Note: {item.specialRequests}</p>
                  )}
                </div>
                <p className="text-yellow-400 font-bold">${(item.itemPrice * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Coupons */}
        {coupons.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Available Coupons</h2>
            <div className="space-y-2">
              {coupons.map((coupon) => {
                const isSelected = selectedCoupon?.id === coupon.id;
                return (
                  <button
                    key={coupon.id}
                    onClick={() => setSelectedCoupon(isSelected ? null : coupon)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-400">{coupon.code}</p>
                        <p className="text-white/60 text-sm">{coupon.discount_percentage}% off</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="text-green-400 text-sm font-medium">-${discountAmount.toFixed(2)}</span>
                        )}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-white/30'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {selectedCoupon && (
              <div className="flex justify-between text-green-400">
                <span>Discount ({selectedCoupon.discount_percentage}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-yellow-400">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Proceed Button */}
        <button
          onClick={handleProceedToPayment}
          disabled={processing}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            `Proceed to Payment - $${total.toFixed(2)}`
          )}
        </button>

        <p className="text-white/40 text-xs text-center mt-3">
          You will be redirected to Stripe for secure payment
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
