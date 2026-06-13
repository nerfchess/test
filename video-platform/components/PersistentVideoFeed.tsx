'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HomeContent } from '@/components/HomeContent';

export function PersistentVideoFeed() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isHome = pathname === '/feed';

  // Do not render the feed until auth has resolved.
  // Once the user is authenticated and the feed mounts, it stays mounted.
  if (loading || !user) return null;

  return (
    <div
      style={{ display: isHome ? 'contents' : 'none' }}
      aria-hidden={!isHome}
    >
      <HomeContent isActive={isHome} />
    </div>
  );
}
