'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getOrCreateOneToOneChat } from '@/lib/supabase/messaging';
import { getUserBusiness, getBusinessLocations, Business, BusinessHours, BusinessLocation } from '@/lib/supabase/profiles';
import { MenuList } from '@/components/MenuList';
import { PostedVideos } from '@/components/PostedVideos';

const BusinessLocationMap = dynamic(
  () => import('@/components/BusinessLocationMap'),
  {
    ssr: false,
    loading: () => <div className="h-[300px] bg-white/5 animate-pulse rounded-t-none" />,
  }
);

interface Profile {
  id: string;
  username: string;
  full_name: string;
  profile_picture_url?: string;
  bio?: string;
  type?: string | null;
}

export default function UserProfilePage() {
  return (
    <ProtectedRoute>
      <UserProfileContent />
    </ProtectedRoute>
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

function UserProfileContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const identifier = params.userId as string;
  const isUUID = UUID_REGEX.test(identifier);
  const menuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLocations, setBusinessLocations] = useState<BusinessLocation[]>([]);
  const [showBusinessHours, setShowBusinessHours] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingLoading, setMessagingLoading] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // 3-dot menu state
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'sage' | 'red' | 'amber'>('sage');

  // Average rating state
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  // Admin mode state (Ctrl+Shift+D) — persisted in localStorage
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('adminMode') === 'true';
    return false;
  });
  const [adminFollowerBoost, setAdminFollowerBoost] = useState(0);
  const realFollowerCountRef = useRef(0);

  useEffect(() => {
    if (identifier) {
      loadProfile();
    }
  }, [identifier]);

  useEffect(() => {
    if (profile?.type) {
      loadBusiness();
      loadLocations();
    } else {
      setBusiness(null);
      setBusinessLocations([]);
    }
  }, [profile?.type]);

  // Load follow status + follower count when profile is loaded
  useEffect(() => {
    if (profile && user) {
      checkFollowStatus();
      loadFollowerCount();
      loadAverageRating();
    }
  }, [profile, user]);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Admin Mode keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setAdminMode(prev => {
          if (prev) {
            // Turning OFF — revert to real count
            localStorage.removeItem('adminMode');
            setAdminFollowerBoost(0);
            setFollowerCount(realFollowerCountRef.current);
          } else {
            // Turning ON — snapshot real count
            localStorage.setItem('adminMode', 'true');
            realFollowerCountRef.current = followerCount;
          }
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [followerCount]);

  // On mount, if admin mode was persisted, snapshot current follower count
  useEffect(() => {
    if (adminMode && followerCount > 0) {
      realFollowerCountRef.current = followerCount;
    }
  }, [adminMode, followerCount]);

  const checkFollowStatus = async () => {
    if (!user || !profile) return;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const loadFollowerCount = async () => {
    if (!profile) return;
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id);
    setFollowerCount(count ?? 0);
  };

  const loadAverageRating = async () => {
    if (!profile) return;
    // Get all videos by this user, then compute avg rating from comments with ratings
    const { data: videos } = await supabase
      .from('videos')
      .select('id')
      .eq('user_id', profile.id);
    if (!videos || videos.length === 0) return;

    const videoIds = videos.map(v => v.id);
    const { data: ratings } = await supabase
      .from('comments')
      .select('rating')
      .in('video_id', videoIds)
      .not('rating', 'is', null);

    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      setAvgRating(Math.round((sum / ratings.length) * 10) / 10);
      setTotalReviews(ratings.length);
    }
  };

  const toggleFollow = async () => {
    if (!user || !profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
        if (adminMode) {
          realFollowerCountRef.current = Math.max(0, realFollowerCountRef.current - 1);
        }
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: profile.id });
        setIsFollowing(true);
        setFollowerCount(c => c + 1 + (adminMode ? 1 : 0));
        if (adminMode) {
          realFollowerCountRef.current = realFollowerCountRef.current + 1;
          setAdminFollowerBoost(b => b + 1);
        }
      }
    } catch {
      // silently fail
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profile?.username || identifier}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastColor('sage');
      setToastMessage('Profile link copied!');
    } catch {
      setToastColor('red');
      setToastMessage('Failed to copy link');
    }
  };

  const handleReport = async () => {
    if (!user || !profile || !reportReason) return;
    setReportLoading(true);
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: profile.id,
          reason: reportReason,
          description: reportDescription || null,
        });
      if (error) throw error;
      setToastColor('sage');
      setToastMessage('Report submitted. Thank you.');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch {
      setToastColor('red');
      setToastMessage('Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!user || !profile) return;
    const confirmed = window.confirm(`Block @${profile.username}? You won't see their content anymore.`);
    if (!confirmed) return;
    try {
      await supabase
        .from('blocks')
        .insert({ blocker_id: user.id, blocked_id: profile.id });
      // Also unfollow if following
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
      }
      setToastColor('amber');
      setToastMessage(`@${profile.username} has been blocked`);
      setTimeout(() => router.push('/feed'), 1200);
    } catch {
      setToastColor('red');
      setToastMessage('Failed to block user');
    }
  };

  const loadLocations = async () => {
    if (!profile) return;
    const { data } = await getBusinessLocations(profile.id);
    setBusinessLocations(data ?? []);
  };

  const loadProfile = async () => {
    try {
      const query = supabase
        .from('profiles')
        .select('id, username, full_name, profile_picture_url, bio, type');

      const { data, error } = isUUID
        ? await query.eq('id', identifier).single()
        : await query.eq('username', identifier).single();

      if (error) throw error;
      setProfile(data);

      // Redirect UUID URLs to username URLs
      if (isUUID && data?.username) {
        router.replace(`/profile/${data.username}`);
        return;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadBusiness = async () => {
    try {
      if (!profile) return;
      const { data, error } = await getUserBusiness(profile.id);

      console.log('Business fetch result:', { data, error }); // DEBUG

      if (!error && data) {
        // getUserBusiness returns an array; take the first entry
        const biz = Array.isArray(data) ? data[0] : data;
        if (biz) {
          // Parse business_hours if it's a string
          if (biz.business_hours && typeof biz.business_hours === 'string') {
            biz.business_hours = JSON.parse(biz.business_hours);
          }
          console.log('Business after parsing:', biz); // DEBUG
          setBusiness(biz);
        } else {
          setBusiness(null);
        }
      } else {
        setBusiness(null);
      }
    } catch (error) {
      console.error('Business load error:', error); // DEBUG
      // Business doesn't exist, which is fine
      setBusiness(null);
    }
  };

  const handleMessageClick = async () => {
    if (!user || !profile) return;
    
    setMessagingLoading(true);
    try {
      console.log('Starting chat with user:', profile.id);
      const { data, error } = await getOrCreateOneToOneChat(user.id, profile.id);
      
      if (error) {
        console.error('Chat creation error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to start conversation: ${errorMsg}`);
        return;
      }
      
      if (data && data.id) {
        console.log('Chat created/found successfully:', data.id);
        router.push(`/chats/${data.id}`);
      } else {
        console.error('No chat data returned:', data);
        alert('Failed to create or get chat');
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${errorMsg}`);
    } finally {
      setMessagingLoading(false);
    }
  };

  useEffect(() => {
    if (user && profile && profile.id === user.id) {
      router.push('/profile');
    }
  }, [user, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A18] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F5F0E8] mx-auto mb-4"></div>
          <p className="text-[#F5F0E8]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#1A1A18] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#F5F0E8] mb-4">Profile Not Found</h2>
          <p className="text-[#F5F0E8]/60 mb-6">{error || 'This profile does not exist.'}</p>
          <Link
            href="/feed"
            className="bg-[#F5A623] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#F5A623]/90 transition-all duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A18] text-[#F5F0E8]">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg transition-all duration-300 ${
          toastColor === 'sage' ? 'bg-[#6BAF7A] text-white' :
          toastColor === 'red' ? 'bg-[#E05C3A] text-white' :
          'bg-[#F5A623] text-black'
        }`}>
          {toastMessage}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-[#242420] border border-[#3A3A34] rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#F5F0E8] mb-4">Report @{profile.username}</h3>
            <div className="space-y-3">
              {REPORT_REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${reportReason === r.value ? 'bg-[#F5A623]/20 border border-[#F5A623]/40' : 'bg-[#1A1A18] border border-[#3A3A34] hover:border-[#F5A623]/30'}`}>
                  <input type="radio" name="reason" value={r.value} checked={reportReason === r.value} onChange={() => setReportReason(r.value)} className="accent-[#F5A623]" />
                  <span className="text-sm text-[#F5F0E8]">{r.label}</span>
                </label>
              ))}
              <textarea
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                placeholder="Additional details (optional)"
                rows={3}
                maxLength={500}
                className="w-full bg-[#1A1A18] border border-[#3A3A34] rounded-lg px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#9E9A90] focus:outline-none focus:border-[#F5A623]/50 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowReportModal(false)} className="flex-1 bg-[#3A3A34] text-[#F5F0E8] rounded-lg py-2.5 text-sm hover:bg-[#3A3A34]/80 transition-colors">Cancel</button>
              <button onClick={handleReport} disabled={!reportReason || reportLoading} className="flex-1 bg-[#E05C3A] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#E05C3A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {reportLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1A1A18]/80 backdrop-blur-md border-b border-[#3A3A34]">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#242420] rounded-full transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-[#F5F0E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">{profile.username || 'Profile'}</h1>
          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-[#242420] rounded-full transition-colors"
              aria-label="More options"
            >
              <svg className="w-6 h-6 text-[#F5F0E8]" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#242420] border border-[#3A3A34] rounded-lg shadow-xl overflow-hidden min-w-[180px] z-20">
                <button
                  onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#F5F0E8] hover:bg-[#F5A623]/10 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-[#E05C3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Report User
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleBlock(); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#E05C3A] hover:bg-[#E05C3A]/10 transition-colors flex items-center gap-3 border-t border-[#3A3A34]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Block User
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-6 pb-32">
        <div className="flex flex-col items-center mb-6">
          <img
            src={profile.profile_picture_url || 'https://via.placeholder.com/120'}
            alt={profile.full_name}
            className="w-32 h-32 rounded-full ring-2 ring-[#F5A623]/40 object-cover mb-4"
          />
          <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
          <p className="text-[#F5F0E8]/60 mb-1">@{profile.username}</p>

          {/* Follower count */}
          <p
            className={`text-[#9E9A90] text-sm mb-4 ${adminMode ? 'cursor-pointer hover:text-[#F5A623] transition-colors select-none' : ''}`}
            onClick={adminMode ? () => {
              setAdminFollowerBoost(b => b + 1);
              setFollowerCount(c => c + 1);
            } : undefined}
          >
            {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
          </p>

          {profile.bio && (
            <p className="text-[#F5F0E8]/80 text-center max-w-md mb-2">{profile.bio}</p>
          )}
          
          {/* Business Info */}
          {business && (
            <div className="flex items-center gap-2 flex-wrap justify-center mb-2">
              <p className="text-[#F5A623] text-sm">🏪 {business.business_name}</p>
              {business.business_type && (
                <span className="bg-[#F5A623]/20 text-[#F5A623] text-xs px-2 py-1 rounded-full capitalize">
                  {business.business_type === 'hybrid' ? '📦 Pickup & Delivery' : `🏷️ ${business.business_type}`}
                </span>
              )}
              <button
                onClick={() => setShowBusinessHours(!showBusinessHours)}
                className="bg-[#F5A623]/20 text-[#F5A623] text-xs px-2 py-1 rounded-full hover:bg-[#F5A623]/30 transition-colors"
              >
                {showBusinessHours ? '⏰ Hide Hours' : '⏰ Show Hours'}
              </button>
            </div>
          )}

          {/* Average Rating */}
          {avgRating !== null && (
            <p className="text-[#F5F0E8] text-sm mb-4">
              ⭐ {avgRating} <span className="text-[#9E9A90]">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 mt-2">
            {/* Follow Button */}
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`font-semibold px-5 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm ${
                isFollowing
                  ? 'bg-[#F5A623] text-black hover:bg-[#F5A623]/90'
                  : 'border-2 border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623]/10'
              }`}
            >
              {isFollowing ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Following
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Follow
                </>
              )}
            </button>
            
            {/* Message Button */}
            <button
              onClick={handleMessageClick}
              disabled={messagingLoading}
              className="bg-[#F5A623] text-black font-semibold px-5 py-2 rounded-lg hover:bg-[#F5A623]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {messagingLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </>
              )}
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="border-2 border-[#3A3A34] text-[#F5F0E8] p-2 rounded-lg hover:bg-[#242420] transition-colors"
              aria-label="Share profile"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Business Hours Section */}
        {showBusinessHours && (
          <div className="mt-8 mb-8">
            <h3 className="text-xl font-semibold text-[#F5F0E8] mb-4">⏰ Business Hours</h3>
            <div className="bg-[#242420] border border-[#3A3A34] rounded-lg p-6 space-y-2">
              {business?.business_hours ? (
                ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="flex justify-between items-center text-sm">
                    <span className="text-[#F5F0E8]/80 capitalize font-medium">{day}</span>
                    <span className="text-[#F5F0E8]/60">
                      {business.business_hours?.[day]?.closed ? (
                        'Closed'
                      ) : (
                        `${business.business_hours?.[day]?.open || ''} - ${business.business_hours?.[day]?.close || ''}`
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[#F5F0E8]/60 text-center py-4">Business hours not set</p>
              )}
            </div>
          </div>
        )}

        {/* Business Location Map */}
        {businessLocations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-[#F5F0E8] mb-4">
              📍 Location{businessLocations.length > 1 ? 's' : ''}
            </h3>
            <div className="bg-[#242420] border border-[#3A3A34] rounded-lg overflow-hidden">
              <BusinessLocationMap
                locations={businessLocations}
                businessName={business?.business_name ?? ''}
              />
            </div>
          </div>
        )}

        {/* Services Section (business only) */}
        {profile.type && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-[#F5F0E8] mb-4">⚙️ Services</h3>
            <div className="bg-[#242420] border border-[#3A3A34] rounded-lg p-6">
              <MenuList userId={profile.id} isOwnProfile={false} />
            </div>
          </div>
        )}

        {/* Videos Section */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-[#F5F0E8] mb-4">📹 Videos</h3>
          <div className="bg-[#242420] border border-[#3A3A34] rounded-lg p-6">
            <PostedVideos userId={profile.id} isOwnProfile={false} />
          </div>
        </div>
      </div>

      {/* Bottom Navigation Hotbar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#1A1A18]/50 backdrop-blur-md border-t border-[#3A3A34]">
        <div className="flex items-center justify-around py-3">
          <Link href="/feed" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/' ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className={`text-xs ${pathname === '/' ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`}>Home</span>
          </Link>
          <Link href="/search" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/search' ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className={`text-xs ${pathname === '/search' ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`}>Search</span>
          </Link>
          <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${pathname === '/upload' ? 'bg-[#F5A623]' : 'bg-[#F5A623]/20'}`}>
              <svg className={`w-6 h-6 ${pathname === '/upload' ? 'text-black' : 'text-[#F5F0E8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
          <Link href="/chats" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname === '/chats' ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className={`text-xs ${pathname === '/chats' ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`}>Chats</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95">
            <svg className={`w-6 h-6 ${pathname?.startsWith('/profile') ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`text-xs ${pathname?.startsWith('/profile') ? 'text-[#F5F0E8]' : 'text-[#F5F0E8]/60'}`}>Profile</span>
          </Link>
        </div>
      </div>

      {/* Admin Mode Badge */}
      {adminMode && (
        <div className="fixed bottom-20 left-3 z-50 rounded-full bg-[#F5A623]/90 px-2.5 py-1 text-[11px] font-semibold text-[#1A1A18] backdrop-blur-sm">
          ⚡ Admin
        </div>
      )}
    </div>
  );
}
