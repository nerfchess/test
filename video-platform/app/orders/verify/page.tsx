'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get('id');
  const token = searchParams.get('token');

  const [order, setOrder] = useState<{ id: string; item_name: string; price: number; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!orderId || !token) {
      setError('Invalid QR code — missing order information.');
    }
  }, [orderId, token]);

  const handleConfirmPickup = async () => {
    if (!orderId || !token) return;

    setCompleting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to complete order');
        if (data.order) setOrder(data.order);
        return;
      }

      setOrder(data.order);
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <p className="text-white/60 mb-6">You need to be signed in as the business owner to verify this order.</p>
          <Link href="/login" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white pb-20">
      <div className="w-full px-4 lg:px-12 py-8">
        {success ? (
          <div className="text-center">
            <svg className="w-20 h-20 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-bold text-green-400 mb-2">Order Completed!</h1>
            <p className="text-white/60 mb-6">The customer has been notified.</p>
            {order && (
              <div className="bg-white/5 border border-green-500/30 rounded-lg p-4 mb-6">
                <p className="text-white font-medium">{order.item_name}</p>
                <p className="text-green-400 font-bold">${order.price.toFixed(2)}</p>
                <p className="text-white/40 text-xs mt-1">Order #{order.id.substring(0, 8)}</p>
              </div>
            )}
            <div className="space-y-3">
              <Link href="/dashboard" className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors">
                Back to Dashboard
              </Link>
              <Link href="/feed" className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors">
                Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Verify Order Pickup</h1>
            <p className="text-white/60 mb-6">Confirm that the customer is picking up their order.</p>

            {orderId && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                <p className="text-white/40 text-xs mb-1">Order ID</p>
                <p className="text-white font-mono">#{orderId.substring(0, 8)}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleConfirmPickup}
              disabled={completing || !orderId || !token}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-semibold py-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {completing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Verifying...
                </>
              ) : (
                'Confirm Pickup'
              )}
            </button>

            <Link href="/dashboard" className="block text-white/40 hover:text-white/60 text-sm mt-4">
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
