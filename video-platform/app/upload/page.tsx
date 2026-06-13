'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { uploadVideoFile, uploadVideoMetadata, promoteVideo } from '@/lib/supabase/videos';
import { getUserCoins } from '@/lib/supabase/profiles';
import dynamic from 'next/dynamic';
const PromotionModal = dynamic(() => import('@/components/PromotionModal').then(mod => mod.PromotionModal), { ssr: false });
import { supabase } from '@/lib/supabase/client';

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}

function UploadContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(100);
  const [boostCoinsFromModal, setBoostCoinsFromModal] = useState<number | null>(null);
  const [videoBoosted, setVideoBoosted] = useState(false);
  const [boostCoinsSpent, setBoostCoinsSpent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCoins = async () => {
      if (!user) return;
      const { data: coins } = await getUserCoins(user.id);
      setUserCoins(coins || 100);
      console.log('Loaded user coins:', coins);
    };
    loadCoins();
  }, [user]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedVideo(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !user) return;

    setError('');
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Simulated progress animation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 30;
          return prev;
        });
      }, 500);

      const { data: uploadData, error: uploadError } = await uploadVideoFile(selectedVideo, user.id);
      
      clearInterval(progressInterval);
      setUploadProgress(70);

      if (uploadError || !uploadData?.publicUrl) {
        throw new Error(uploadError?.message || 'Failed to upload video');
      }

      let businessId: string | undefined;
      if (businessName && category) {
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .eq('business_name', businessName)
          .single();

        if (existingBusiness) {
          businessId = existingBusiness.id;
        } else {
          const { data: newBusiness, error: businessError } = await supabase
            .from('businesses')
            .insert({
              owner_id: user.id,
              business_name: businessName,
              category: category as 'food' | 'retail' | 'services',
              video_url: uploadData.publicUrl,
              latitude: 0,
              longitude: 0,
            })
            .select()
            .single();

          if (businessError) throw businessError;
          businessId = newBusiness.id;
        }
      }

      setUploadProgress(85);

      const { data: videoData, error: metadataError } = await uploadVideoMetadata({
        user_id: user.id,
        video_url: uploadData.publicUrl,
        caption: caption || undefined,
        business_id: businessId,
      });

      if (metadataError) throw metadataError;

      setUploadProgress(100);

      const { data: coins } = await getUserCoins(user.id);
      setUserCoins(coins || 100);
      setUploadedVideoId(videoData.id);
      
      setSelectedVideo(null);
      setVideoPreview(null);
      setCaption('');
      setBusinessName('');
      setCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setIsUploading(false);
      setUploadProgress(0);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleConfirmUploadWithBoost = async (coinsToSpend: number) => {
    if (!selectedVideo || !user) {
      throw new Error('Video or user not found');
    }

    setUploadProgress(10);

    // Simulated progress animation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 85) return prev + Math.random() * 25;
        return prev;
      });
    }, 600);

    try {
      // Upload the video
      const { data: uploadData, error: uploadError } = await uploadVideoFile(selectedVideo, user.id);
      
      clearInterval(progressInterval);
      setUploadProgress(70);

      if (uploadError || !uploadData?.publicUrl) {
        throw new Error(uploadError?.message || 'Failed to upload video');
      }

      // Create business if provided
      let businessId: string | undefined;
      if (businessName && category) {
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .eq('business_name', businessName)
          .single();

        if (existingBusiness) {
          businessId = existingBusiness.id;
        } else {
          const { data: newBusiness, error: businessError } = await supabase
            .from('businesses')
            .insert({
              owner_id: user.id,
              business_name: businessName,
              category: category as 'food' | 'retail' | 'services',
              video_url: uploadData.publicUrl,
              latitude: 0,
              longitude: 0,
            })
            .select()
            .single();

          if (businessError) throw businessError;
          businessId = newBusiness.id;
        }
      }

      setUploadProgress(80);

      // Upload video metadata
      const { data: videoData, error: metadataError } = await uploadVideoMetadata({
        user_id: user.id,
        video_url: uploadData.publicUrl,
        caption: caption || undefined,
        business_id: businessId,
      });

      if (metadataError) throw metadataError;

      setUploadProgress(90);

      // Apply boost immediately
      if (coinsToSpend > 0) {
        const { data: boostData, error: boostError } = await promoteVideo(user.id, videoData.id, coinsToSpend);
        if (boostError) throw boostError;
      }

      setUploadProgress(100);

      // Update coins
      const { data: coins } = await getUserCoins(user.id);
      setUserCoins(coins || 100);
      setUploadedVideoId(videoData.id);
      setBoostCoinsFromModal(null);
      setVideoBoosted(true);
      setBoostCoinsSpent(coinsToSpend);
      
      // Reset form
      setSelectedVideo(null);
      setVideoPreview(null);
      setCaption('');
      setBusinessName('');
      setCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setUploadProgress(0);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A18] text-[#F5F0E8] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1A1A18]/80 backdrop-blur-md border-b border-[#3A3A34]">
        <div className="w-full px-4 lg:px-12 py-4">
          <h1 className="entrance-slide text-2xl font-bold text-[#F5F0E8]" style={{ animation: 'slideInLeft 0.4s ease-out forwards', opacity: 0 }}>Create Post</h1>
        </div>
      </div>

      {/* Success Screen */}
      {uploadedVideoId && !showPromotionModal && videoBoosted && (
        <div className="w-full px-4 lg:px-12 py-16 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-[#6BAF7A]/20 border border-[#6BAF7A] rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-10 h-10 text-[#6BAF7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2 text-[#F5F0E8]">Video Boosted!</h2>
              <p className="text-[#9E9A90]">Your video is now live and boosted in the feed</p>
            </div>

            <div className="bg-gradient-to-r from-[#6BAF7A]/10 to-[#F5A623]/10 border border-[#6BAF7A]/30 rounded-2xl p-6 my-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#9E9A90]">Boost Applied</span>
                  <span className="font-semibold text-[#6BAF7A]">✓ Confirmed</span>
                </div>
                <div className="h-px bg-[#3A3A34]"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9E9A90]">Coins Spent</span>
                  <span className="text-2xl font-bold text-[#F5A623]">🪙 {boostCoinsSpent}</span>
                </div>
                <div className="h-px bg-[#3A3A34]"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9E9A90]">Remaining Coins</span>
                  <span className="text-2xl font-bold text-[#F5A623]">🪙 {userCoins}</span>
                </div>
              </div>
            </div>

            <p className="text-[#9E9A90] text-sm">Your boosted video will get more visibility and reach in the feed!</p>

            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={() => {
                  setUploadedVideoId(null);
                  setVideoBoosted(false);
                  setBoostCoinsSpent(0);
                }}
                className="px-6 py-3 bg-[#242420] hover:bg-[#2E2E28] border border-[#3A3A34] rounded-xl font-semibold transition-all min-h-[48px]"
              >
                Create Another
              </button>
              <button
                onClick={() => {
                  router.push('/feed');
                  router.refresh();
                }}
                className="px-6 py-3 bg-[#F5A623] hover:bg-[#F5A623]/90 text-black rounded-xl font-semibold transition-all flex items-center gap-2 min-h-[48px] active:scale-[0.98]"
              >
                <span>👀</span>
                <span>View Feed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Screen */}
      {uploadedVideoId && !showPromotionModal && !videoBoosted && (
        <div className="w-full px-4 lg:px-12 py-16 flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[#6BAF7A]/20 border border-[#6BAF7A] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#6BAF7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-2 text-[#F5F0E8]">Video Uploaded!</h2>
              <p className="text-[#9E9A90]">Your video is now live in the feed</p>
            </div>

            <div className="bg-[#242420] border border-[#3A3A34] rounded-2xl p-6 my-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#9E9A90] text-sm">Your Coins</p>
                  <p className="text-3xl font-bold text-[#F5A623]">🪙 {userCoins}</p>
                </div>
                <svg className="w-12 h-12 text-[#F5A623]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h-2m0 0h-2m2 0v-2m0 2v2m0-6h4v4m0 0h-2m2 0v-2m0 2v2" />
                </svg>
              </div>
            </div>

            <p className="text-[#9E9A90] text-sm">Boost your video to get more exposure in the feed</p>

            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={() => router.push('/feed')}
                className="px-6 py-3 bg-[#242420] hover:bg-[#2E2E28] border border-[#3A3A34] rounded-xl font-semibold transition-all min-h-[48px]"
              >
                View Feed
              </button>
              <button
                onClick={() => setShowPromotionModal(true)}
                className="px-6 py-3 bg-[#F5A623] hover:bg-[#F5A623]/90 text-black rounded-xl font-semibold transition-all flex items-center gap-2 min-h-[48px] active:scale-[0.98] shadow-lg shadow-[#F5A623]/20"
              >
                <span>🚀</span>
                <span>Boost Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!uploadedVideoId && (
        <div className="entrance-fade w-full px-4 lg:px-12 py-8" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s forwards', opacity: 0 }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-[#E05C3A]/10 border border-[#E05C3A] text-[#E05C3A] px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Video Upload Area */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#9E9A90]">
              Upload Video
            </label>
            
            {!videoPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#3A3A34] bg-[#242420] rounded-xl p-12 text-center cursor-pointer transition-all duration-300 hover:border-[#F5A623] hover:bg-[#2E2E28] hover:shadow-lg hover:shadow-[#F5A623]/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
              >
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-[#6BAF7A] transition-transform duration-300 hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-[#F5F0E8] font-semibold mb-2">Drag your video here or click to browse</p>
                <p className="text-sm text-[#9E9A90]">MP4, MOV, AVI up to 100MB (Max 15 minutes)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
              </button>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-[#242420] border border-[#3A3A34]">
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-96 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="absolute top-4 right-4 bg-[#E05C3A] hover:bg-[#E05C3A]/90 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[#E05C3A]/40 active:scale-95"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Caption Input */}
          <div className="space-y-2">
            <label htmlFor="caption" className="block text-sm font-medium text-[#9E9A90]">
              Caption
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setCaption(e.target.value);
                }
              }}
              placeholder="Describe your business or service..."
              rows={4}
              maxLength={500}
              className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder-[#9E9A90]/50 focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/30 transition-all duration-200"
            />
            <p className={`text-xs ${caption.length >= 450 ? 'text-[#F5A623]' : 'text-[#9E9A90]'}`}>
              {caption.length}/500 characters
            </p>
          </div>

          {/* Business Info (Optional) */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="businessName" className="block text-sm font-medium text-[#9E9A90]">
                Business Name (Optional)
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter business name"
                className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-3 text-[#F5F0E8] placeholder-[#9E9A90]/50 focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/30 transition-all duration-200"
              />
            </div>

            {businessName && (
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-[#9E9A90]">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required={!!businessName}
                  className="w-full bg-[#242420] border border-[#3A3A34] rounded-xl px-4 py-3 text-[#F5F0E8] focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/30 transition-all duration-200"
                >
                  <option value="" style={{ color: '#000', backgroundColor: '#f3f4f6' }}>Select category</option>
                  <option value="food" style={{ color: '#000', backgroundColor: '#f3f4f6' }}>Food</option>
                  <option value="retail" style={{ color: '#000', backgroundColor: '#f3f4f6' }}>Retail</option>
                  <option value="services" style={{ color: '#000', backgroundColor: '#f3f4f6' }}>Services</option>
                </select>
              </div>
            )}

            {/* Boost Button */}
            <button
              type="button"
              onClick={() => {
                setUploadedVideoId('temp');
                setVideoBoosted(false);
                setBoostCoinsSpent(0);
                setShowPromotionModal(true);
              }}
              className="w-full mt-4 bg-[#F5A623]/20 hover:bg-[#F5A623]/30 border border-[#F5A623]/50 text-[#F5A623] font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>🚀</span>
              <span>Learn About Boosting</span>
            </button>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#F5F0E8]">Uploading video...</span>
                <span className="text-sm text-[#9E9A90]">{uploadProgress}%</span>
              </div>
              <div className="relative h-2 bg-[#3A3A34] rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F5A623] via-[#F5A623] to-[#F5A623]/70 rounded-full transition-all duration-300 ease-out shadow-lg shadow-[#F5A623]/40"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedVideo || isUploading}
            className="w-full bg-[#F5A623] text-black font-semibold py-4 rounded-xl disabled:bg-[#242420] disabled:text-[#9E9A90]/40 disabled:cursor-not-allowed hover:bg-[#F5A623]/90 active:scale-[0.98] transition-all duration-200 min-h-[48px] shadow-lg shadow-[#F5A623]/20"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload Video'
            )}
          </button>
        </form>
      </div>
      )}

      {/* Promotion Modal */}
      {uploadedVideoId && (
        <PromotionModal
          isOpen={showPromotionModal}
          onClose={() => {
            setShowPromotionModal(false);
            if (uploadedVideoId !== 'temp') {
              router.push('/feed');
              router.refresh();
            }
            if (uploadedVideoId === 'temp') {
              setUploadedVideoId(null);
              setVideoBoosted(false);
              setBoostCoinsSpent(0);
            }
          }}
          videoId={uploadedVideoId}
          userCoins={userCoins}
          onConfirmUpload={uploadedVideoId === 'temp' ? handleConfirmUploadWithBoost : undefined}
          onSuccess={(newBoost, coinsSpent, remainingCoins) => {
            setUserCoins(remainingCoins);
            setShowPromotionModal(false);
            router.push('/feed');
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
