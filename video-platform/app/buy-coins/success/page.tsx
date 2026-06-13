'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4">
        <p className="text-white/70">Loading confirmation...</p>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [confirmationNumber, setConfirmationNumber] = useState('');

  useEffect(() => {
    if (!sessionId || !user) return;

    const getConfirmation = async () => {
      try {
        const response = await fetch(`/api/verify-purchase?session_id=${sessionId}`);
        const data = await response.json();
        
        if (data.confirmationNumber) {
          setConfirmationNumber(data.confirmationNumber);
        }
      } catch (error) {
        console.error('Error:', error);
        // Still show confirmation page even if API fails
      }
    };

    getConfirmation();
  }, [sessionId, user]);

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 border border-green-500/30 rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="text-6xl mb-4">✅</div>

          <h1 className="text-3xl font-bold mb-2 text-green-400">Order Confirmed!</h1>
          <p className="text-white/60 mb-8">
            Payment received and order confirmed.
          </p>

          {/* Confirmation Number */}
          {confirmationNumber && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
              <p className="text-white/60 text-sm mb-2">Order Confirmation Number</p>
              <p className="text-2xl font-mono font-bold text-green-400 tracking-wider">{confirmationNumber}</p>
              <p className="text-white/40 text-xs mt-2">Save this for your records</p>
            </div>
          )}

          {/* Session ID */}
          {sessionId && (
            <div className="bg-[#1A1A18]/40 rounded-lg p-4 mb-6 text-left">
              <p className="text-white/60 text-xs mb-1">Session ID:</p>
              <p className="text-white/40 font-mono text-xs break-all">{sessionId}</p>
            </div>
          )}

          {/* Status Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-blue-400 text-sm">
              ✓ Your coins will be added to your account shortly
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/profile"
              className="block bg-green-500 hover:bg-green-400 text-black py-3 rounded-lg transition-all font-semibold"
            >
              Go to Profile
            </Link>
            <Link
              href="/feed"
              className="block bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
