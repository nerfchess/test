'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrderQRCode } from '@/components/QRCode';

interface OrderInfo {
  orderId: string;
  token: string;
  itemName: string;
  price: number;
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4">
          <p className="text-white/70">Loading purchase details...</p>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  );
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const verifyPurchase = async () => {
      try {
        const response = await fetch('/api/verify-item-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();
        if (data.confirmationNumber) {
          setConfirmationNumber(data.confirmationNumber);
        }
        if (data.orders && data.orders.length > 0) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyPurchase();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-transparent text-white pb-20">
      <div className="w-full px-4 lg:px-12 py-8">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-2 text-green-400">Purchase Complete!</h1>
          <p className="text-white/60 mb-8">Thank you for your purchase</p>

          {confirmationNumber && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
              <p className="text-white/60 text-sm mb-2">Order Confirmation Number</p>
              <p className="text-2xl font-mono font-bold text-green-400 tracking-wider">{confirmationNumber}</p>
              <p className="text-white/40 text-xs mt-2">Save this for your records</p>
            </div>
          )}

          {/* QR Codes for pickup */}
          {loading ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto" />
              <p className="text-white/40 text-sm mt-3">Generating pickup QR code...</p>
            </div>
          ) : orders.length > 0 ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
              <p className="text-blue-400 font-semibold mb-1">Show this QR code at pickup</p>
              <p className="text-white/40 text-xs mb-4">
                The business will scan this to confirm your order
              </p>
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.orderId} className="flex flex-col items-center">
                    <OrderQRCode orderId={order.orderId} token={order.token} size={180} />
                    <p className="text-white text-sm font-medium mt-2">{order.itemName}</p>
                    <p className="text-white/40 text-xs">${order.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {sessionId && (
            <div className="bg-[#1A1A18]/40 rounded-lg p-4 mb-6 text-left">
              <p className="text-white/60 text-xs mb-1">Session ID:</p>
              <p className="text-white/40 font-mono text-xs break-all">{sessionId}</p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/profile"
              className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              View Order History
            </Link>
            <Link
              href="/feed"
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
