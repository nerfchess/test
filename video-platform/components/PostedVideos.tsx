'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
const PromotionModal = dynamic(() => import('@/components/PromotionModal').then(mod => mod.PromotionModal), { ssr: false });
import { getUserCoins } from '@/lib/supabase/profiles';

interface PostedVideo {
  id: string;
  video_url: string;
  caption?: string;
  created_at: string;
  boost_value?: number;
  coins_spent_on_promotion?: number;
  likes: number;
  comments: number;
  views: number;
}

interface PostedVideosProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function PostedVideos({ userId, isOwnProfile = true }: PostedVideosProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<PostedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [promotingVideoId, setPromotingVideoId] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(0);

  useEffect(() => {
    loadPostedVideos();
    if (isOwnProfile) {
      getUserCoins(userId).then(({ data }) => setUserCoins(data ?? 0));
    }
  }, [userId, isOwnProfile]);

  const loadPostedVideos = async () => {
    try {
      setLoading(true);

      const { data: userVideos, error: videosError } = await supabase
        .from('videos')
        .select('id, video_url, caption, created_at, boost_value, coins_spent_on_promotion, view_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      if (!userVideos || userVideos.length === 0) {
        setVideos([]);
        return;
      }

      const { data: allLikes } = await supabase
        .from('likes')
        .select('video_id');

      const likesMap: { [key: string]: number } = {};
      if (allLikes) {
        allLikes.forEach((like: any) => {
          if (like.video_id) {
            likesMap[like.video_id] = (likesMap[like.video_id] || 0) + 1;
          }
        });
      }

      const videoIds = userVideos.map(v => v.id);
      console.log('PostedVideos - Loading comments for videos:', videoIds.slice(0, 3), '... (' + videoIds.length + ' total)');

      let allComments: any[] = [];

      try {
        if (videoIds.length > 0) {
          const { data, error } = await supabase
            .from('comments')
            .select('id, video_id, content, user_id')
            .in('video_id', videoIds)
            .is('parent_comment_id', null);

          if (error) {
            console.error('Error with .in() filter on comments:', error);
          } else if (data && data.length > 0) {
            console.log('PostedVideos - Got comments with .in() filter:', data.length);
            allComments = data;
          } else {
            console.log('PostedVideos - No comments found with .in() filter');
          }
        }
      } catch (err) {
        console.error('Exception fetching comments with .in():', err);
      }

      if (allComments.length === 0 && videoIds.length > 0) {
        try {
          console.log('PostedVideos - Trying fallback: fetch all parent comments');
          const { data, error } = await supabase
            .from('comments')
            .select('id, video_id, content, user_id')
            .is('parent_comment_id', null);

          if (error) {
            console.error('Error fetching all comments:', error);
          } else if (data) {
            allComments = data.filter((c: any) => videoIds.includes(c.video_id));
            console.log('PostedVideos - Fallback got comments:', allComments.length);
          }
        } catch (err) {
          console.error('Exception fetching all comments:', err);
        }
      }

      const commentsMap: { [key: string]: number } = {};
      allComments.forEach((comment: any) => {
        if (comment.video_id) {
          commentsMap[comment.video_id] = (commentsMap[comment.video_id] || 0) + 1;
        }
      });
      console.log('PostedVideos - Final comments map:', commentsMap);

      const videosWithStats = userVideos.map((video: any) => ({
        ...video,
        likes: likesMap[video.id] || 0,
        comments: commentsMap[video.id] || 0,
        views: video.view_count || 0,
      }));

      setVideos(videosWithStats);
    } catch (error) {
      console.error('Error loading posted videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingVideoId(videoId);

      // Delete from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      // Remove from local state
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeletingVideoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-white/60">
        <p>No videos posted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div
          key={video.id}
          className="bg-transparent border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all duration-200"
        >
          <div className="flex gap-4 p-4">
            {/* Video Thumbnail */}
            <div
              className="flex-shrink-0 w-20 h-20 cursor-pointer"
              onClick={() => router.push(`/feed?videoId=${video.id}`)}
            >
              <video
                src={video.video_url}
                className="w-full h-full object-cover rounded"
              />
            </div>

            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate mb-2">
                {video.caption || 'Untitled Video'}
              </h4>
              <p className="text-xs text-white/50 mb-3">
                {new Date(video.created_at).toLocaleDateString()}
              </p>

              {/* Stats */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-white/70">
                  <span>👁️</span>
                  <span>{video.views} views</span>
                </div>
                <div className="flex items-center gap-1 text-white/70">
                  <span>❤️</span>
                  <span>{video.likes} likes</span>
                </div>
                <div className="flex items-center gap-1 text-white/70">
                  <span>💬</span>
                  <span>{video.comments} comments</span>
                </div>
              </div>

            {/* Boost Info */}
            {video.boost_value && video.boost_value > 1 && (
              <div className="mt-2 inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-1">
                <span className="text-xs text-yellow-300">🚀 Boosted</span>
                <span className="text-xs text-yellow-300/70">
                  (Boost: {video.boost_value.toFixed(1)})
                </span>
              </div>
            )}
            </div>

            {/* Actions */}
            {isOwnProfile && (
              <div className="flex flex-col justify-center gap-2 ml-2">
                <button
                  onClick={() => setPromotingVideoId(video.id)}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm font-medium px-3 py-1.5 rounded hover:bg-yellow-500/10"
                  title="Boost this video"
                >
                  🚀 Boost
                </button>
                <button
                  onClick={() => deleteVideo(video.id)}
                  disabled={deletingVideoId === video.id}
                  className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium px-3 py-1.5 rounded hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete this video"
                >
                  {deletingVideoId === video.id ? '...' : '🗑️ Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {isOwnProfile && (
        <PromotionModal
          isOpen={promotingVideoId !== null}
          onClose={() => setPromotingVideoId(null)}
          videoId={promotingVideoId || ''}
          userCoins={userCoins}
          onSuccess={(newBoost, coinsSpent, remainingCoins) => {
            setUserCoins(remainingCoins);
            setVideos(prev =>
              prev.map(v =>
                v.id === promotingVideoId
                  ? {
                      ...v,
                      boost_value: newBoost,
                      coins_spent_on_promotion: (v.coins_spent_on_promotion || 0) + coinsSpent,
                    }
                  : v
              )
            );
          }}
        />
      )}
    </div>
  );
}
