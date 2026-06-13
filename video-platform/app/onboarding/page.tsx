'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EditableProfilePicture } from '@/components/EditableProfilePicture';
import { updateProfile } from '@/lib/supabase/profiles';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleComplete = async () => {
    if (!user) return;

    if (bio.trim()) {
      setSaving(true);
      setError(null);

      try {
        const { error: updateError } = await updateProfile(user.id, {
          bio: bio.trim(),
        });

        if (updateError) {
          setError('Failed to save bio. Please try again.');
          setSaving(false);
          return;
        }
      } catch {
        setError('Something went wrong. Please try again.');
        setSaving(false);
        return;
      }
    }

    router.push('/feed');
    router.refresh();
  };

  const handleSkip = () => {
    router.push('/feed');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Localy</h1>
          <p className="text-white/60">Set up your profile</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <EditableProfilePicture
            userId={user.id}
            currentImageUrl={undefined}
            fullName={user.user_metadata?.full_name}
            username={user.user_metadata?.username}
            isOwnProfile={true}
            className="w-32 h-32"
          />
          <p className="text-white/40 text-sm">Tap to add a profile photo</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200 resize-none"
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={300}
          />
          <p className="text-white/40 text-xs mt-1 text-right">{bio.length}/300</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 active:scale-98 transition-all duration-200"
        >
          {saving ? 'Saving...' : 'Complete'}
        </button>

        <p className="text-center">
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-white/60 hover:text-white hover:underline transition-colors duration-200"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
