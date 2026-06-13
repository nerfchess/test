'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { supabase } from '@/lib/supabase/client';

export function AppBottomNav() {
  const pathname = usePathname();
  const { getCartCount } = useCart();
  const { user } = useAuth();
  const { togglePanel, unreadCount } = useActivity();
  const cartCount = getCartCount();
  const [isBusiness, setIsBusiness] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: string; width: string }>({ left: '0%', width: '0%' });
  const navRef = useRef<HTMLDivElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  const getActiveHref = () => {
    if (pathname === '/feed') return '/feed';
    if (pathname?.startsWith('/search')) return '/search';
    if (pathname?.startsWith('/upload')) return '/upload';
    if (pathname?.startsWith('/chats')) return '/chats';
    if (pathname?.startsWith('/cart')) return '/cart';
    if (pathname?.startsWith('/dashboard')) return '/dashboard';
    if (pathname?.startsWith('/profile')) return '/profile';
    return null;
  };

  useEffect(() => {
    if (!user) {
      setIsBusiness(false);
      return;
    }

    const checkBusiness = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single();
      setIsBusiness(!!data?.type);
    };

    checkBusiness();
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
    const msgChannel = supabase.channel('bottomnav-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchUnread()).subscribe();
    const readChannel = supabase.channel('bottomnav-chat-read').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members' }, () => fetchUnread()).subscribe();
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
    const channel = supabase.channel('bottomnav-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'item_purchases' }, () => fetchPending()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isBusiness]);

  useEffect(() => {
    // Calculate indicator position based on active tab
    if (!navRef.current) return;

    const navItems = navRef.current.querySelectorAll('[data-nav-item]');
    let activeIndex = 0;

    navItems.forEach((item, index) => {
      if (item.querySelector('a')?.getAttribute('href') === getActiveHref()) {
        activeIndex = index;
      }
    });

    const totalItems = navItems.length;
    const itemWidth = 100 / totalItems;
    const itemLeft = activeIndex * itemWidth;

    setIndicatorStyle({
      left: `${itemLeft}%`,
      width: `${itemWidth}%`,
    });
  }, [pathname]);

  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/feed') {
      return pathname === '/feed';
    }

    return pathname?.startsWith(href);
  };

  // Define nav items exactly once
  const navItems = [
    {
      href: '/feed',
      label: 'Home',
      icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
      fillIcon: true,
    },
    {
      href: '/search',
      label: 'Search',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    },
    {
      href: '/upload',
      label: 'Upload',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
    },
    {
      href: '/chats',
      label: 'Chats',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
      badgeCount: unreadMessages,
    },
    {
      href: '/cart',
      label: 'Cart',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />,
      isCart: true,
    },
    {
      href: '/dashboard',
      label: 'Orders',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
      businessOnly: true,
      badgeCount: pendingOrders,
    },
    {
      href: '#activity',
      label: 'Activity',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
      isBell: true,
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-30 border-t border-[#3A3A34] lg:hidden ${
      pathname === '/feed' ? 'bg-[#1A1A18]/80 backdrop-blur-md' : 'bg-charcoal'
    }`}>
      {/* Animated Indicator Bar */}
      <div
        className="absolute bottom-0 h-1 bg-[#F5A623] transition-all duration-200 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
      
      <div ref={navRef} className="flex items-center justify-around py-3">
        {navItems.map((item) => {
          // Skip Orders if not a business account
          if (item.businessOnly && !isBusiness) {
            return null;
          }

          // Render Activity bell — identical structure to NavItem
          if (item.isBell) {
            return (
              <div key="activity" data-nav-item>
                <NavItem href="#" label={item.label} active={false} icon={item.icon} onClick={(e: React.MouseEvent) => { e.preventDefault(); togglePanel(); }} badge={unreadCount} />
              </div>
            );
          }

          // Render Cart with special handling for badge
          if (item.isCart) {
            return (
              <div key={item.href} data-nav-item>
                <Link href={item.href} className="relative flex flex-col items-center gap-1 transition-colors duration-200 hover:scale-105 active:scale-95">
                  <svg className={`h-6 w-6 ${isActive(item.href) ? 'text-[#F5F0E8]' : 'text-[#9E9A90]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F5A623] text-[10px] font-bold text-charcoal">
                      {cartCount}
                    </span>
                  )}
                  <span className={`text-xs ${isActive(item.href) ? 'text-[#F5F0E8]' : 'text-[#9E9A90]'}`}>{item.label}</span>
                </Link>
              </div>
            );
          }

          // Render all other nav items
          return (
            <div key={item.href} data-nav-item>
              <NavItem href={item.href} label={item.label} active={isActive(item.href)} icon={item.icon} fillIcon={item.fillIcon} badge={'badgeCount' in item ? (item as { badgeCount: number }).badgeCount : undefined} />
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function NavItem({ href, label, active, icon, fillIcon = false, onClick, badge }: { href: string; label: string; active: boolean; icon: React.ReactNode; fillIcon?: boolean; onClick?: (e: React.MouseEvent) => void; badge?: number }) {
  const colorClass = active ? 'text-[#F5F0E8]' : 'text-[#9E9A90]';

  return (
    <Link href={href} onClick={onClick} className="relative flex flex-col items-center gap-1 transition-colors duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623] rounded-lg p-1" aria-label={label}>
      <svg className={`h-6 w-6 ${colorClass}`} fill={fillIcon ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F5A623] text-[10px] font-bold text-[#1A1A18] px-0.5">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className={`text-xs ${colorClass}`}>{label}</span>
    </Link>
  );
}
