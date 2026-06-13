'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { supabase } from '@/lib/supabase/client';

interface FollowingAccount {
  id: string;
  username: string;
  full_name: string;
  profile_picture_url: string | null;
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { getCartCount } = useCart();
  const { user } = useAuth();
  const { togglePanel, unreadCount } = useActivity();
  const cartCount = getCartCount();
  const [isBusiness, setIsBusiness] = useState(false);
  const [following, setFollowing] = useState<FollowingAccount[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (!user) { setIsBusiness(false); setFollowing([]); return; }
    const check = async () => {
      const { data } = await supabase.from('profiles').select('type').eq('id', user.id).single();
      setIsBusiness(!!data?.type);
    };
    check();
  }, [user]);

  // Fetch unread messages count
  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    const fetchUnread = async () => {
      const { data: memberships } = await supabase
        .from('chat_members')
        .select('chat_id, last_read')
        .eq('user_id', user.id);
      if (!memberships || memberships.length === 0) { setUnreadMessages(0); return; }
      let total = 0;
      for (const m of memberships) {
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', m.chat_id)
          .neq('sender_id', user.id);
        if (m.last_read) query = query.gt('created_at', m.last_read);
        const { count } = await query;
        total += count || 0;
      }
      setUnreadMessages(total);
    };
    fetchUnread();
    const msgChannel = supabase.channel('sidebar-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchUnread()).subscribe();
    const readChannel = supabase.channel('sidebar-chat-read').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members' }, () => fetchUnread()).subscribe();
    return () => { supabase.removeChannel(msgChannel); supabase.removeChannel(readChannel); };
  }, [user]);

  // Fetch pending orders count (business only)
  useEffect(() => {
    if (!user || !isBusiness) { setPendingOrders(0); return; }
    const fetchPending = async () => {
      const { count } = await supabase
        .from('item_purchases')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('status', 'pending');
      setPendingOrders(count || 0);
    };
    fetchPending();
    const channel = supabase.channel('sidebar-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'item_purchases' }, () => fetchPending()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isBusiness]);

  useEffect(() => {
    if (!user) { setFollowing([]); return; }
    const loadFollowing = async () => {
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles:following_id(id, username, full_name, profile_picture_url)')
        .eq('follower_id', user.id)
        .limit(5);
      if (data) {
        const accounts = data
          .map((f: Record<string, unknown>) => f.profiles as FollowingAccount | null)
          .filter((p): p is FollowingAccount => p !== null);
        setFollowing(accounts);
      }
    };
    loadFollowing();
  }, [user]);

  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') return null;

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed';
    return pathname?.startsWith(href);
  };

  const navItems = [
    { href: '/feed', label: 'Home', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z', fill: true },
    { href: '/search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { href: '/upload', label: 'Upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { href: '/chats', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', badge: unreadMessages },
    { href: '/cart', label: 'Cart', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z', cart: true },
    ...(isBusiness ? [{ href: '/dashboard', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', badge: pendingOrders }] : []),
    { href: '#activity', label: 'Activity', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', activity: true },
    { href: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen z-20 w-60 shrink-0 flex-col border-r border-[#3A3A34] bg-[#1A1A18]/95 backdrop-blur-xl">
      <div className="px-5 py-6">
        <Link href="/feed" className="text-2xl font-bold text-[#F5F0E8]">Localy</Link>
      </div>
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);

          // Render Activity as a button instead of a Link
          if ('activity' in item) {
            return (
              <a
                key="activity"
                href="#"
                role="button"
                onClick={(e) => { e.preventDefault(); togglePanel(); }}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-all duration-200 hover-lift text-[#9E9A90] hover:text-[#F5F0E8] hover:bg-[#242420]`}
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span>{item.label}</span>
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F5A623] text-xs font-bold text-[#1A1A18] px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-all duration-200 hover-lift ${
                active
                  ? 'bg-[#F5A623]/10 text-[#F5A623] border-l-4 border-[#F5A623]'
                  : 'text-[#9E9A90] hover:text-[#F5F0E8] hover:bg-[#242420]'
              }`}
            >
              <svg className="h-5 w-5 shrink-0" fill={item.fill ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span>{item.label}</span>
              {'cart' in item && cartCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#F5A623] text-[10px] font-bold text-[#1A1A18]">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F5A623] text-[10px] font-bold text-[#1A1A18] px-1">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Following Accounts */}
      {user && following.length > 0 && (
        <div className="px-3">
          <div className="border-t border-[#3A3A34] my-2" />
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-[#9E9A90]">Following Accounts</p>
          <div className="flex flex-col gap-1">
            {following.map((account) => (
              <a
                key={account.id}
                href="#"
                onClick={(e) => { e.preventDefault(); router.push(`/profile/${account.id}`); }}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-[#242420] hover:border-l-2 hover:border-[#F5A623] border-l-2 border-transparent"
              >
                {account.profile_picture_url ? (
                  <Image
                    src={account.profile_picture_url}
                    alt={account.full_name}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-[#3A3A34] flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-[#9E9A90]">{account.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                  </div>
                )}
                <p className="min-w-0 flex-1 truncate">
                  <span className="text-[12px] font-bold text-[#F5F0E8]">{account.full_name}</span>
                  <span className="text-[11px] text-[#9E9A90]"> · @{account.username}</span>
                </p>
              </a>
            ))}
          </div>
          <Link
            href="/profile#following"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 mt-0.5 text-[13px] text-[#9E9A90] transition-all duration-150 hover:text-[#F5F0E8] hover:bg-[#242420]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>View all</span>
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="px-3">
        <div className="border-t border-[#3A3A34] my-2" />
        <div className="px-3 py-4 space-y-1.5">
          <a href="#" className="block text-[11px] text-[#9E9A90] hover:text-[#F5A623] transition-colors">Company</a>
          <a href="#" className="block text-[11px] text-[#9E9A90] hover:text-[#F5A623] transition-colors">Program</a>
          <a href="#" className="block text-[11px] text-[#9E9A90] hover:text-[#F5A623] transition-colors">Terms &amp; Policies</a>
          <p className="text-[11px] text-[#9E9A90] pt-2">&copy; 2026 Localys</p>
        </div>
      </div>
    </aside>
  );
}
