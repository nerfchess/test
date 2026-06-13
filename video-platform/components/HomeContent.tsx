'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getVideosFeed, getLikeCounts, likeItem, unlikeItem, bookmarkVideo, unbookmarkVideo, getWeightedVideoFeed, trackVideoView } from '@/lib/supabase/videos';
import { getUserCoins } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
const CommentModal = dynamic(() => import('@/components/CommentModal').then(mod => mod.CommentModal), { ssr: false });
import { Toast } from '@/components/Toast';
import { sharePost } from '@/lib/utils/share';
import { ThemeToggle } from '@/components/ThemeToggle';
import { haversineDistance } from '@/lib/utils/geo';
import { computeAveragePrice, computeRoundedPriceRange } from '@/lib/utils/pricing';

interface Video {
  id: string;
  user_id?: string;
  business_id?: string;
  video_url: string;
  caption?: string;
  created_at: string;
  profiles?: {
    id?: string;
    username: string;
    full_name: string;
    profile_picture_url?: string;
  };
  businesses?: {
    id: string;
    owner_id?: string;
    user_id?: string;
    business_name: string;
    category: string;
    profile_picture_url?: string;
    average_rating?: number;
    total_reviews?: number;
    latitude?: number;
    longitude?: number;
  };
  like_count?: number;
}

interface HeaderProfile {
  full_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
}

interface HomeContentProps {
  isActive: boolean;
}



export function HomeContent({ isActive }: HomeContentProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeAnimating, setLikeAnimating] = useState<string | null>(null);
  const [bookmarkAnimating, setBookmarkAnimating] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [bookmarkedVideos, setBookmarkedVideos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [userCoins, setUserCoins] = useState(100);
  const [showCoinBadge, setShowCoinBadge] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationsByProfile, setLocationsByProfile] = useState<Record<string, { latitude: number; longitude: number }[]>>({});
  const [priceRanges, setPriceRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [volume, setVolume] = useState(0.5); // Default 50% volume
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);

  const [headerProfile, setHeaderProfile] = useState<HeaderProfile | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const prevVolumeRef = useRef(0.5);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Admin mode state (Ctrl+Shift+D) — persisted in localStorage
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('adminMode') === 'true';
    return false;
  });
  const [adminLikeBoosts, setAdminLikeBoosts] = useState<{ [key: string]: number }>({});
  const realLikeCountsRef = useRef<{ [key: string]: number }>({});

  // Follow state for video overlay
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [followAnimating, setFollowAnimating] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
    if (user) {
      loadUserInteractions();
      loadUserCoins();
    }
  }, [user]);

  // Real-time subscription for comment counts
  useEffect(() => {
    const channel = supabase
      .channel('home-comment-counts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: 'parent_comment_id=eq.null' },
        (payload) => {
          const videoId = (payload.new as { video_id?: string }).video_id;
          if (videoId) {
            setCommentCounts(prev => ({
              ...prev,
              [videoId]: (prev[videoId] || 0) + 1
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        (payload) => {
          const videoId = (payload.old as { video_id?: string }).video_id;
          const parentId = (payload.old as { parent_comment_id?: string | null }).parent_comment_id;
          if (videoId && !parentId) {
            setCommentCounts(prev => ({
              ...prev,
              [videoId]: Math.max((prev[videoId] || 1) - 1, 0)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Admin Mode keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setAdminMode(prev => {
          if (prev) {
            // Turning OFF — revert to real counts
            localStorage.removeItem('adminMode');
            setAdminLikeBoosts({});
            setLikeCounts({ ...realLikeCountsRef.current });
          } else {
            // Turning ON — snapshot real counts
            localStorage.setItem('adminMode', 'true');
            realLikeCountsRef.current = { ...likeCounts };
          }
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [likeCounts]);

  // On mount, if admin mode was persisted, snapshot current like counts
  useEffect(() => {
    if (adminMode && Object.keys(likeCounts).length > 0) {
      realLikeCountsRef.current = { ...likeCounts };
    }
  }, [adminMode, Object.keys(likeCounts).length]);

  // Load follow states for all video owners
  useEffect(() => {
    if (!user || videos.length === 0) return;
    const loadFollowStates = async () => {
      const userIds = [...new Set(videos.map(v => v.user_id).filter(Boolean))] as string[];
      if (userIds.length === 0) return;
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds);
      if (data) {
        setFollowedUsers(new Set(data.map(f => f.following_id)));
      }
    };
    loadFollowStates();
  }, [user, videos]);

  // Handle videoId query param (e.g. from profile video click)
  useEffect(() => {
    const targetVideoId = searchParams.get('videoId');
    if (!targetVideoId || videos.length === 0) return;

    const idx = videos.findIndex(v => v.id === targetVideoId);
    if (idx >= 0) {
      setCurrentIndex(idx);
      // Clean up the URL param
      router.replace('/feed', { scroll: false });
    } else {
      // Video not in feed — fetch and prepend it
      (async () => {
        try {
          const { data } = await supabase
            .from('videos')
            .select('*, profiles:user_id(id, username, full_name, profile_picture_url), businesses:business_id(id, owner_id, user_id, business_name, category, profile_picture_url, average_rating, total_reviews, latitude, longitude)')
            .eq('id', targetVideoId)
            .single();

          if (data) {
            setVideos(prev => [data as Video, ...prev]);
            setCurrentIndex(0);
          }
        } catch (err) {
          console.error('Error fetching video by ID:', err);
        }
        router.replace('/feed', { scroll: false });
      })();
    }
  }, [searchParams, videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadUserCoins();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Pause video when navigating away, resume when coming back
  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!isActive) {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.muted = true;
          video.pause();
        }
      });
      setCommentModalOpen(false);
      return;
    }

    if (!currentVideo) return;

    currentVideo.muted = false;
    if (isPlaying) {
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          const mediaError = error as { name?: string };
          if (mediaError.name !== 'AbortError' && mediaError.name !== 'NotAllowedError') {
            console.error('Video resume error:', error);
          }
        });
      }
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVideos = async () => {
    try {
      const { data, error } = await getWeightedVideoFeed(20, 0);
      if (error) throw error;
      if (data) {
        const videosData = data as Video[];
        setVideos(videosData);

        const counts: { [key: string]: number } = {};
        const commentCounts: { [key: string]: number } = {};

        const videoIds = videosData
          .map(v => v.id)
          .filter((id): id is string => !!id && typeof id === 'string');

        const posterProfileIds = Array.from(
          new Set(
            videosData
              .map((video) => video.user_id)
              .filter((id): id is string => Boolean(id && typeof id === 'string'))
          )
        );

        console.log('Video IDs for rating fetch:', videoIds);

        const feedBusinessIds = Array.from(
          new Set(
            videosData
              .map((video) => video.business_id)
              .filter((id): id is string => Boolean(id && typeof id === 'string'))
          )
        );

        const allFilterIds = [...videoIds, ...feedBusinessIds];
        const { data: allLikes } = allFilterIds.length > 0
          ? await supabase
              .from('likes')
              .select('business_id, video_id')
              .or(`video_id.in.(${videoIds.join(',')}),business_id.in.(${feedBusinessIds.join(',')})`)
          : { data: [] };

        if (posterProfileIds.length > 0) {
          const { data: businessLocations } = await supabase
            .from('business_locations')
            .select('profile_id, latitude, longitude')
            .in('profile_id', posterProfileIds);

          const nextLocationsByProfile: Record<string, { latitude: number; longitude: number }[]> = {};
          posterProfileIds.forEach((profileId) => {
            nextLocationsByProfile[profileId] = [];
          });

          (businessLocations || []).forEach((row: { profile_id: string; latitude: number | string; longitude: number | string }) => {
            if (!row.profile_id) return;
            const latitude = typeof row.latitude === 'number' ? row.latitude : Number(row.latitude);
            const longitude = typeof row.longitude === 'number' ? row.longitude : Number(row.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            if (!nextLocationsByProfile[row.profile_id]) {
              nextLocationsByProfile[row.profile_id] = [];
            }
            nextLocationsByProfile[row.profile_id].push({ latitude, longitude });
          });

          setLocationsByProfile(nextLocationsByProfile);
        } else {
          setLocationsByProfile({});
        }

        if (allLikes) {
          allLikes.forEach((like: { business_id: string | null; video_id: string | null }) => {
            if (like.business_id) {
              counts[like.business_id] = (counts[like.business_id] || 0) + 1;
            }
            if (like.video_id) {
              counts[like.video_id] = (counts[like.video_id] || 0) + 1;
            }
          });
        }

        // Fetch comment counts in a single batch query
        if (videoIds.length > 0) {
          try {
            const { data: commentsData } = await supabase
              .from('comments')
              .select('video_id')
              .in('video_id', videoIds)
              .is('parent_comment_id', null);

            if (commentsData) {
              commentsData.forEach((c: { video_id: string }) => {
                if (c.video_id) {
                  commentCounts[c.video_id] = (commentCounts[c.video_id] || 0) + 1;
                }
              });
            }
          } catch (err) {
            console.error('Error fetching comment counts:', err);
          }
        }


        const businesses = videosData
          .map((video) => video.businesses)
          .filter((business): business is NonNullable<Video['businesses']> => Boolean(business && business.id));

        const businessIds = Array.from(new Set(businesses.map((business) => business.id)));
        const businessToOwnerMap: Record<string, string> = {};

        businesses.forEach((business) => {
          const ownerId = business.owner_id || business.user_id;
          if (ownerId) {
            businessToOwnerMap[business.id] = ownerId;
          }
        });

        const ownerIds = Array.from(new Set(Object.values(businessToOwnerMap)));

        if (businessIds.length > 0 && ownerIds.length > 0) {
          const { data: menuItems } = await supabase
            .from('menu_items')
            .select('user_id, price')
            .in('user_id', ownerIds);

          const pricesByBusiness: Record<string, number[]> = {};

          businessIds.forEach((businessId) => {
            pricesByBusiness[businessId] = [];
          });

          const ownerToBusinessIds: Record<string, string[]> = {};
          Object.entries(businessToOwnerMap).forEach(([businessId, ownerId]) => {
            if (!ownerToBusinessIds[ownerId]) {
              ownerToBusinessIds[ownerId] = [];
            }
            ownerToBusinessIds[ownerId].push(businessId);
          });

          (menuItems || []).forEach((item: { user_id: string; price: number | string }) => {
            if (!item.user_id) return;
            const price = typeof item.price === 'number' ? item.price : Number(item.price);
            if (!Number.isFinite(price) || price <= 0) return;
            const linkedBusinessIds = ownerToBusinessIds[item.user_id] || [];
            linkedBusinessIds.forEach((businessId) => {
              pricesByBusiness[businessId].push(price);
            });
          });

          const ranges: Record<string, { min: number; max: number }> = {};
          Object.keys(pricesByBusiness).forEach((businessId) => {
            const computedRange = computeRoundedPriceRange(pricesByBusiness[businessId]);
            if (computedRange) {
              ranges[businessId] = computedRange;
            }
          });

          setPriceRanges(ranges);
        } else {
          setPriceRanges({});
        }

        [...businessIds, ...videoIds].forEach(id => {
          if (!(id in counts)) {
            counts[id] = 0;
          }
          if (!(id in commentCounts)) {
            commentCounts[id] = 0;
          }
        });

        setLikeCounts(counts);
        setCommentCounts(commentCounts);
        if (process.env.NODE_ENV === 'development') {
          console.log('Loaded like counts:', counts);
          console.log('Loaded rating counts:', commentCounts);
        }
      }
    } catch (error) {
      console.error(`Error loading videos: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;

    try {
      const { data: likes } = await supabase
        .from('likes')
        .select('business_id, video_id')
        .eq('user_id', user.id);

      const likedSet = new Set<string>();

      if (likes) {
        likes.forEach((l: { business_id: string | null; video_id: string | null }) => {
          if (l.business_id) likedSet.add(l.business_id);
          if (l.video_id) likedSet.add(l.video_id);
        });
      }

      setLikedVideos(likedSet);
      if (process.env.NODE_ENV === 'development') {
        console.log('Loaded liked items:', Array.from(likedSet));
      }

      const { data: bookmarks } = await supabase
        .from('video_bookmarks')
        .select('video_id')
        .eq('user_id', user.id);

      if (bookmarks) {
        setBookmarkedVideos(new Set(bookmarks.map((b: { video_id: string | null }) => b.video_id).filter(Boolean) as string[]));
      }
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const loadUserCoins = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance, type, full_name, username, profile_picture_url')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setHeaderProfile({
          full_name: data.full_name || null,
          username: data.username || null,
          profile_picture_url: data.profile_picture_url || null,
        });
        const hasProfileType = data.type !== null;
        setShowCoinBadge(hasProfileType);
        if (hasProfileType) {
          setUserCoins(typeof data.coin_balance === 'number' ? data.coin_balance : 100);
        }
      } else {
        setShowCoinBadge(false);
        console.error('Error loading coins:', error);
      }
    } catch (error) {
      setShowCoinBadge(false);
      console.error('Exception loading coins:', error);
    }
  };

  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.volume = volume;
    }
  }, [volume, currentIndex]);

  useEffect(() => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentIndex]);

  // Set volume on video when it's loaded
  useEffect(() => {
    if (!isActive) return;

    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.muted = false;
      currentVideo.volume = volume;
      currentVideo.playbackRate = playbackSpeed;
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((error: unknown) => {
          const mediaError = error as { name?: string };
          if (mediaError.name !== 'AbortError' && mediaError.name !== 'NotAllowedError') {
            console.error('Video play error:', error);
          }
        });
      }
      setIsPlaying(true);
    }

    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex) {
        video.muted = true;
        video.pause();
      }
    });
  }, [currentIndex, videos, volume, playbackSpeed, isActive]);

  const togglePlayPause = async () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;

    if (currentVideo.paused) {
      try {
        await currentVideo.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      currentVideo.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeEnter = useCallback(() => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    setShowVolumeSlider(true);
  }, []);

  const handleVolumeLeave = useCallback(() => {
    volumeTimeoutRef.current = setTimeout(() => setShowVolumeSlider(false), 300);
  }, []);

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 0.5);
    }
  }, [volume]);

  useEffect(() => {
    if (!isActive) return;
    if (videos.length > 0 && currentIndex >= 0 && currentIndex < videos.length) {
      const currentVideo = videos[currentIndex];
      if (currentVideo && currentVideo.id) {
        trackVideoView(currentVideo.id, user?.id).catch((error: unknown) => {
          console.warn('Failed to track video view:', error);
        });
      }
    }
  }, [currentIndex, videos, user?.id, isActive]);

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling || videos.length === 0) return;

    setIsScrolling(true);
    const delta = e.deltaY;

    if (delta > 0) {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    } else if (delta < 0) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1);
      }
    }

    setTimeout(() => setIsScrolling(false), 500);
  };

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || videos.length === 0) return;

    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50;
    const isDownSwipe = distance < -50;

    if (isUpSwipe) {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    } else if (isDownSwipe) {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        setCurrentIndex(videos.length - 1);
      }
    }
  };

  const toggleLike = async (videoId: string, businessId?: string, event?: React.MouseEvent) => {
    if (!user) {
      setToastMessage('Please sign in to like posts');
      return;
    }

    setLikeAnimating(videoId);
    const likeKey = businessId || videoId;
    const itemType = businessId ? 'business' : 'video';
    const isLiked = likedVideos.has(likeKey);

    // Admin Mode: every click adds +1 display-only
    if (adminMode) {
      setAdminLikeBoosts(prev => ({ ...prev, [likeKey]: (prev[likeKey] || 0) + 1 }));
      setLikeCounts(prev => ({ ...prev, [likeKey]: (prev[likeKey] || 0) + 1 }));
      setTimeout(() => setLikeAnimating(null), 300);
      return;
    }

    try {
      if (isLiked) {
        const { error } = await unlikeItem(user.id, likeKey, itemType as 'video' | 'business');
        if (error) throw error;

        setLikedVideos(prev => {
          const next = new Set(prev);
          next.delete(likeKey);
          return next;
        });

        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: Math.max(0, (prev[likeKey] || 0) - 1)
        }));
      } else {
        const { error } = await likeItem(user.id, likeKey, itemType as 'video' | 'business');
        if (error) throw error;

        setLikedVideos(prev => new Set(prev).add(likeKey));

        setLikeCounts(prev => ({
          ...prev,
          [likeKey]: (prev[likeKey] || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setToastMessage('Could not update like — try again');
    }

    setTimeout(() => setLikeAnimating(null), 300);
  };

  const toggleBookmark = async (videoId: string, event?: React.MouseEvent) => {
    if (!user) {
      setToastMessage('Please sign in to bookmark videos');
      return;
    }

    setBookmarkAnimating(videoId);
    const isBookmarked = bookmarkedVideos.has(videoId);

    try {
      if (isBookmarked) {
        const { error } = await unbookmarkVideo(user.id, videoId);
        if (error) throw error;
        setBookmarkedVideos(prev => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
        setToastMessage('Bookmark removed');
      } else {
        const { error } = await bookmarkVideo(user.id, videoId);
        if (error) throw error;
        setBookmarkedVideos(prev => new Set(prev).add(videoId));
        setToastMessage('Video bookmarked!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      setToastMessage('Could not update bookmark — try again');
    }

    setTimeout(() => setBookmarkAnimating(null), 300);
  };

  const toggleVideoFollow = async (userId: string | undefined) => {
    if (!user || !userId) {
      setToastMessage('Please sign in to follow');
      return;
    }
    setFollowAnimating(userId);
    const isFollowed = followedUsers.has(userId);
    try {
      if (isFollowed) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
        setFollowedUsers(prev => { const next = new Set(prev); next.delete(userId); return next; });
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        setFollowedUsers(prev => new Set(prev).add(userId));
      }
    } catch {
      setToastMessage('Could not update follow');
    }
    setTimeout(() => setFollowAnimating(null), 400);
  };

  const handleProfileClick = (userId?: string, username?: string) => {
    if (!userId && !username) {
      console.warn('Profile click: userId is missing');
      return;
    }
    router.push(`/profile/${username || userId}`);
  };

  const handleCommentClick = (postId: string) => {
    setCommentPostId(postId);
    setCommentModalOpen(true);
  };

  const handleCommentAdded = async () => {
    // Refresh the comment count for the current video
    if (commentPostId) {
      try {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('video_id', commentPostId)
          .is('parent_comment_id', null);

        setCommentCounts(prev => ({
          ...prev,
          [commentPostId]: count || 0
        }));
      } catch (err) {
        console.error('Error updating comment count:', err);
      }
    }
  };

  const handleShareClick = async (video: Video) => {
    const businessName = video.businesses?.business_name || video.profiles?.full_name || 'Business';
    const url = `${window.location.origin}/video/${video.id}`;

    const result = await sharePost({
      title: `Check out ${businessName} on Localy`,
      text: video.caption || `Watch this video from ${businessName}`,
      url: url,
    });

    if (result.success && !result.usedWebShare) {
      setToastMessage('Link copied to clipboard');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 lg:left-60 overflow-hidden bg-[#1A1A18] text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 lg:left-60 overflow-hidden bg-[#1A1A18] text-foreground flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No videos yet</h2>
          <Link
            href="/upload"
            className="bg-[var(--foreground)] text-[var(--background)] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200"
          >
            Upload First Video
          </Link>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  if (!currentVideo) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-0 lg:left-60 overflow-hidden bg-[#1A1A18] text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }
  const currentBusiness = currentVideo.businesses;
  const likeKey = currentBusiness?.id || currentVideo.id;
  const isLiked = likedVideos.has(likeKey);
  const isBookmarked = bookmarkedVideos.has(currentVideo.id);

  const getNearestLocationForVideo = (video: Video) => {
    const profileId = video.user_id;
    if (profileId && locationsByProfile[profileId] && locationsByProfile[profileId].length > 0) {
      const candidateLocations = locationsByProfile[profileId];

      if (!userLocation) {
        return candidateLocations[0];
      }

      return candidateLocations.reduce((closest, current) => {
        const closestDistance = haversineDistance(userLocation.lat, userLocation.lng, closest.latitude, closest.longitude);
        const currentDistance = haversineDistance(userLocation.lat, userLocation.lng, current.latitude, current.longitude);
        return currentDistance < closestDistance ? current : closest;
      });
    }

    const latitude = video.businesses?.latitude;
    const longitude = video.businesses?.longitude;
    if (typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return null;
  };

  const getDistanceForVideo = (video: Video) => {
    if (!userLocation) return null;
    const nearestLocation = getNearestLocationForVideo(video);
    if (!nearestLocation) return null;
    return haversineDistance(userLocation.lat, userLocation.lng, nearestLocation.latitude, nearestLocation.longitude);
  };

  const formatDistanceLabel = (distanceKm: number | null) => {
    if (distanceKm === null) return '';
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
    return `${distanceKm.toFixed(1)} km`;
  };

  const getEtaMinutes = (distanceKm: number | null) => {
    if (distanceKm === null) return null;
    return Math.max(4, Math.round((distanceKm / 35) * 60));
  };

  const currentDistanceKm = getDistanceForVideo(currentVideo);
  const distance = formatDistanceLabel(currentDistanceKm);

  return (
    <>
      <style>{`
        .home-content-root {
          scrollbar-width: none;
          overscroll-behavior: none;
        }
        .home-content-root::-webkit-scrollbar {
          display: none;
        }
        @keyframes followPop {
          0% { transform: translate(-50%, 0) scale(0); }
          60% { transform: translate(-50%, 0) scale(1.2); }
          100% { transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
      <div className="home-content-root fixed top-0 left-0 right-0 bottom-0 lg:left-60 z-10 overflow-hidden overscroll-none bg-[#1A1A18] text-foreground">
      {/* Ambient Particle Background - CSS shimmer effect */}
      <div className="home-feed-particles" aria-hidden="true" />

      {/* Video Feed Container */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative h-full w-full overflow-hidden overscroll-behavior-none"
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-transform duration-500 ${
              index === currentIndex ? 'translate-y-0 animate-scale-in' :
              index < currentIndex ? '-translate-y-full' : 'translate-y-full'
            }`}
          >
            {(() => {
              const feedBusiness = video.businesses;
              const feedNearestLocation = getNearestLocationForVideo(video);
              const feedDistanceKm = getDistanceForVideo(video);
              const feedDistanceLabel = formatDistanceLabel(feedDistanceKm);
              const feedEta = getEtaMinutes(feedDistanceKm);

              return (
                <>
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={video.video_url}
              className="h-full w-full object-contain cursor-pointer"
              controls={false}
              loop
              playsInline
              muted={!isActive || index !== currentIndex}
              autoPlay={index === currentIndex}
              onClick={index === currentIndex ? togglePlayPause : undefined}
            />

            {/* Centered Play Icon - shown when paused */}
            {index === currentIndex && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <svg className="w-12 h-12 text-[#F5F0E8] opacity-50 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}

            {/* Business Info Overlay - Enhanced Glassmorphism */}
            <div className="video-overlay-glass absolute bottom-0 left-0 right-0 px-4 pt-6 pb-3 border-t border-[#3A3A34]">
              <button
                onClick={() => handleProfileClick(video.user_id, video.profiles?.username)}
                onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(video.user_id, video.profiles?.username))}
                className="text-left focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 focus:ring-offset-[#1A1A18] rounded"
                aria-label={`View profile of ${feedBusiness?.business_name || video.profiles?.full_name || 'Business'}`}
              >
                <h2 className="text-2xl font-bold text-[#F5F0E8] mb-2 hover:underline">
                  {feedBusiness?.business_name || video.profiles?.full_name || 'Business'}
                </h2>
              </button>
              <p className="text-[#F5F0E8]/80 text-sm mb-2">{video.caption || ''}</p>
              <div className="flex items-center gap-4 text-[#F5F0E8]/90 text-sm">
                {feedBusiness?.average_rating && (
                  <>
                    <span>⭐ {feedBusiness.average_rating.toFixed(1)}</span>
                    <span>•</span>
                  </>
                )}
                <span>{commentCounts[video.id] || 0} reviews</span>
                {feedDistanceLabel && (
                  <>
                    <span>•</span>
                    <span>{feedDistanceLabel} away</span>
                  </>
                )}
              </div>

            </div>

            {feedBusiness && (
              <div className="absolute left-0 top-1/2 z-20 -translate-y-1/2 pl-2 sm:pl-3 lg:left-60">
                <div className="group flex items-center">
                  <div className="rounded-r-xl border border-[#3A3A34] bg-[#1A1A18]/85 p-2 sm:p-3 backdrop-blur-xl">
                    <span className="text-base sm:text-xl" aria-hidden="true">📍</span>
                    <span className="sr-only">Business quick info</span>
                  </div>

                  <div className="ml-1 sm:ml-2 w-0 overflow-hidden rounded-xl border border-[#3A3A34] bg-[#242420]/85 opacity-0 backdrop-blur-xl transition-all duration-300 group-hover:w-[220px] group-hover:opacity-100 group-focus-within:w-[220px] group-focus-within:opacity-100 sm:group-hover:w-[260px] sm:group-focus-within:w-[260px]">
                    <div className="p-2 sm:p-3">
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                        <div className="rounded-lg bg-[#3A3A34]/50 px-2 py-2">
                          <p className="text-[#9E9A90]">Avg Price</p>
                          <p className="text-[#F5F0E8] font-semibold">
                            {feedBusiness.id && priceRanges[feedBusiness.id]
                              ? (() => {
                                  const avgPrice = computeAveragePrice(priceRanges[feedBusiness.id]);
                                  return avgPrice ? `~$${avgPrice}` : '—';
                                })()
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#3A3A34]/50 px-2 py-2">
                          <p className="text-[#9E9A90]">Distance</p>
                          <p className="text-[#F5F0E8] font-semibold">{feedDistanceLabel || 'Use GPS'}</p>
                        </div>
                        <div className="rounded-lg bg-[#3A3A34]/50 px-2 py-2">
                          <p className="text-[#9E9A90]">ETA</p>
                          <p className="text-[#F5F0E8] font-semibold">{feedEta !== null ? `${feedEta} min` : '—'}</p>
                        </div>
                      </div>

                      <div className="mt-1.5 sm:mt-2 flex gap-1.5 sm:gap-2">
                        <a
                          href={feedNearestLocation
                            ? `https://www.google.com/maps/dir/?api=1&destination=${feedNearestLocation.latitude},${feedNearestLocation.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(feedBusiness.business_name)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#F5A623] text-black text-[10px] sm:text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[#F5A623]/90 transition-all"
                        >
                          Directions
                        </a>
                        <Link
                          href={`/profile/${video.profiles?.username || video.user_id}`}
                          className="rounded-lg bg-[#3A3A34]/50 border border-[#3A3A34] text-[#F5F0E8] text-[10px] sm:text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-[#3A3A34]/80 transition-all"
                        >
                          Menu
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Top Header */}
      <header className="absolute top-0 left-0 right-0 z-30 border-b border-[#3A3A34] bg-[#1A1A18]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 md:px-5">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#F5F0E8]">Localy</h1>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Volume Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleVolumeEnter}
              onMouseLeave={handleVolumeLeave}
            >
              <button
                onClick={toggleMute}
                onTouchStart={handleVolumeEnter}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3A3A34] bg-[#242420] transition-colors hover:bg-[#2E2E28]"
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              >
                <svg className="w-4 h-4 text-[#F5F0E8]" fill="currentColor" viewBox="0 0 24 24">
                  {volume === 0 ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : volume < 0.5 ? (
                    <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>
              {/* Dropdown slider */}
              <div
                className={`absolute top-full right-0 mt-2 transition-all duration-200 ${showVolumeSlider ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                <div className="rounded-xl border border-[#3A3A34] bg-[#1A1A18]/95 backdrop-blur-xl px-3 py-3 flex items-center gap-2 shadow-lg">
                  <svg className="w-3.5 h-3.5 text-[#9E9A90] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volume * 100)}
                    onChange={(e) => setVolume(parseInt(e.target.value, 10) / 100)}
                    className="h-1.5 w-24 cursor-pointer rounded-full bg-[#3A3A34] accent-[#F5A623] outline-none"
                    aria-label="Volume slider"
                    onMouseEnter={handleVolumeEnter}
                  />
                  <svg className="w-3.5 h-3.5 text-[#9E9A90] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                </div>
              </div>
            </div>

            <ThemeToggle />

            {showCoinBadge && (
              <Link
                href="/buy-coins"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#3A3A34] bg-[#242420] px-3 py-2 text-sm font-medium text-[#F5F0E8] transition-colors hover:bg-[#2E2E28]"
                aria-label="Buy coins"
              >
                <span>🪙</span>
                <span>{userCoins}</span>
              </Link>
            )}

            <Link
              href="/profile"
              className="hidden md:flex items-center gap-2 transition-all duration-200 hover:opacity-80 active:scale-95"
              aria-label="Open profile"
            >
              {headerProfile?.profile_picture_url ? (
                <Image
                  src={headerProfile.profile_picture_url}
                  alt={headerProfile.full_name || headerProfile.username || 'Profile'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover border border-[#3A3A34]"
                  unoptimized
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#242420] text-xs font-semibold text-[#F5F0E8] border border-[#3A3A34]">
                  {(headerProfile?.full_name || headerProfile?.username || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="max-w-[140px] leading-none">
                <p className="mb-0 truncate text-xs font-semibold text-[#F5F0E8]">
                  @{headerProfile?.username || 'profile'}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Right Side - Interaction Buttons */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 pr-2 sm:gap-3 md:gap-4 md:pr-4">
        {/* Profile Picture */}
        <div className="relative">
          <button
            onClick={() => handleProfileClick(currentVideo.user_id, currentVideo.profiles?.username)}
            onKeyDown={(e) => handleKeyDown(e, () => handleProfileClick(currentVideo.user_id, currentVideo.profiles?.username))}
            className="action-button-animate rounded-full focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 focus:ring-offset-[#1A1A18]"
            aria-label={`View profile of ${currentBusiness?.business_name || currentVideo.profiles?.full_name || 'user'}`}
          >
            <Image
              src={currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url || 'https://via.placeholder.com/60'}
              alt={currentBusiness?.business_name || 'Business'}
              width={56}
              height={56}
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full border-2 border-[#3A3A34] object-cover transition-transform duration-200 hover:scale-110 active:scale-95"
              unoptimized={!(currentBusiness?.profile_picture_url || currentVideo.profiles?.profile_picture_url)}
            />
          </button>
          {/* Follow Button */}
          {user && currentVideo.user_id && currentVideo.user_id !== user.id && (
            <button
              onClick={() => toggleVideoFollow(currentVideo.user_id)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 transition-transform duration-400"
              aria-label={followedUsers.has(currentVideo.user_id!) ? 'Unfollow' : 'Follow'}
              style={{ animation: followAnimating === currentVideo.user_id ? 'followPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined }}
            >
              <div className={`h-[25px] w-[25px] rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                followedUsers.has(currentVideo.user_id!)
                  ? 'bg-[#F5A623] text-[#1A1A18]'
                  : 'border border-[#F5F0E8] bg-[#1A1A18]/80 text-[#F5F0E8]'
              }`}>
                {followedUsers.has(currentVideo.user_id!) ? '✓' : '+'}
              </div>
            </button>
          )}
        </div>

        {/* Like Button - show for all videos */}
        <button
          onClick={(e) => toggleLike(currentVideo.id, currentBusiness?.id, e)}
          onKeyDown={(e) => handleKeyDown(e, () => toggleLike(currentVideo.id, currentBusiness?.id))}
          className="action-button-animate flex flex-col items-center gap-1 transition-transform duration-200 active:scale-95"
          aria-label={isLiked ? 'Unlike video' : 'Like video'}
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isLiked ? 'bg-[#F5A623] shadow-lg shadow-[#F5A623]/40' : 'border border-[#3A3A34] bg-[#1A1A18]/80 backdrop-blur-xl hover:border-[#F5A623]/50 hover:shadow-lg hover:shadow-[#F5A623]/20'
          } ${likeAnimating === currentVideo.id ? 'like-icon-pop' : ''}`}>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#F5F0E8] transition-all duration-300 ${
                likeAnimating === currentVideo.id ? 'scale-150' : ''
              }`}
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-[#F5F0E8] text-[10px] sm:text-xs font-semibold">
            {likeCounts[likeKey] || 0}
          </span>
        </button>

        {/* Reviews Button */}
        <button
          onClick={() => handleCommentClick(currentVideo.id)}
          onKeyDown={(e) => handleKeyDown(e, () => handleCommentClick(currentVideo.id))}
          className="action-button-animate flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95"
          aria-label="Add a review or comment"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-[#3A3A34] bg-[#1A1A18]/80 backdrop-blur-xl transition-all duration-300 hover:bg-[#242420]/90 hover:border-[#F5A623] hover:shadow-lg hover:shadow-[#F5A623]/30 active:scale-95">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#F5F0E8] transition-colors duration-300 hover:text-[#F5A623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-[#F5F0E8] text-[10px] sm:text-xs font-semibold">{commentCounts[currentVideo.id] || 0}</span>
        </button>

        {/* Location Button */}
        {distance && (
          <button className="action-button-animate flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95" aria-label={`Distance: ${distance}`}>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-[#3A3A34] bg-[#1A1A18]/80 backdrop-blur-xl transition-all duration-300 hover:bg-[#242420]/90 hover:border-[#F5A623] hover:shadow-lg hover:shadow-[#F5A623]/30 active:scale-95">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#F5F0E8] transition-colors duration-300 hover:text-[#F5A623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-[#F5F0E8] text-[10px] sm:text-xs font-semibold">{distance}</span>
          </button>
        )}

        {/* Bookmark Button */}
        <button
          onClick={(e) => toggleBookmark(currentVideo.id, e)}
          className="action-button-animate flex flex-col items-center gap-1 transition-transform duration-200 active:scale-95"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark video'}
        >
          <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isBookmarked ? 'bg-[#F5A623] shadow-lg shadow-[#F5A623]/40' : 'border border-[#3A3A34] bg-[#1A1A18]/80 backdrop-blur-xl hover:border-[#F5A623]/50 hover:shadow-lg hover:shadow-[#F5A623]/20'
          } ${bookmarkAnimating === currentVideo.id ? 'bookmark-icon-pop' : ''}`}>
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#F5F0E8] transition-all duration-300 ${
                bookmarkAnimating === currentVideo.id ? 'scale-150' : ''
              }`}
              fill={isBookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
        </button>

        {/* Share Button */}
        <button
          onClick={() => handleShareClick(currentVideo)}
          onKeyDown={(e) => handleKeyDown(e, () => handleShareClick(currentVideo))}
          className="action-button-animate flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-110 active:scale-95"
          aria-label="Share this video"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 items-center justify-center rounded-full border border-[#3A3A34] bg-[#1A1A18]/80 backdrop-blur-xl transition-all duration-300 hover:bg-[#242420]/90 hover:border-[#F5A623] hover:shadow-lg hover:shadow-[#F5A623]/30 active:scale-95">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#F5F0E8] transition-colors duration-300 hover:text-[#F5A623]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
        </button>

      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false);
          void handleCommentAdded();
        }}
        postId={commentPostId}
        businessName={currentBusiness?.business_name || currentVideo.profiles?.full_name}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Admin Mode Badge */}
      {adminMode && (
        <div className="fixed bottom-20 left-3 z-50 rounded-full bg-[#F5A623]/90 px-2.5 py-1 text-[11px] font-semibold text-[#1A1A18] backdrop-blur-sm">
          ⚡ Admin
        </div>
      )}
    </div>
    </>
  );
}
