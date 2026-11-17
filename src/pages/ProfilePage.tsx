import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogOut, Moon, Shield, Sun, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { compressImageFile } from '../utils/studioArt.ts';

export const ProfilePage: React.FC = () => {
  const {
    user,
    profile,
    isAdmin,
    theme,
    setTheme,
    openAuthModal,
    updateUserProfile,
    resetPassword,
    resendVerificationEmail,
    signOutUser,
  } = useAuth();
  const { housemates, fanPolls, userVotes } = useData();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [favoriteHousemateId, setFavoriteHousemateId] = useState(
    profile?.favoriteHousemateId || ''
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile?.notificationsEnabled ?? true
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setPhotoUrl(profile.photoUrl || '');
      setFavoriteHousemateId(profile.favoriteHousemateId || '');
      setNotificationsEnabled(profile.notificationsEnabled ?? true);
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-5">
        <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
          Sign In to View Your Profile
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage your account preferences, favorite housemate, and community fan poll votes.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('signin')}
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 0.78);
      setPhotoUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await updateUserProfile({
        displayName: displayName.trim() || 'PBB Fan',
        bio: bio.trim(),
        photoUrl,
        favoriteHousemateId,
        themePreference: theme,
        notificationsEnabled,
      });
      setStatusMsg('Profile and account settings saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await resetPassword(user.email);
      setStatusMsg(`Password reset instructions sent to ${user.email}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not send reset email.');
    }
  };

  const castVotesList = Object.values(userVotes);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-6">
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Account &amp; Preferences
          </p>
          <h1 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
            My Profile
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Open Admin Dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={signOutUser}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/15 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {!user.emailVerified && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200">
          <span>
            Your email ({user.email}) is not verified yet. Verified accounts are required to vote in fan polls.
          </span>
          <button
            type="button"
            onClick={async () => {
              await resendVerificationEmail();
              setStatusMsg('Verification email sent.');
            }}
            className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 cursor-pointer"
          >
            Resend Verification
          </button>
        </div>
      )}

      {statusMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
            Profile Details &amp; Settings
          </h2>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-zinc-900 flex items-center justify-center shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-xl font-bold text-amber-400">
                  {(displayName || user.email || 'P')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                Upload Avatar
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
              </label>
              <p className="text-[11px] text-zinc-500">
                {user.email} · Role: <span className="uppercase">{isAdmin ? 'Admin' : 'Fan'}</span>
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Fan Bio
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={400}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share which housemates or seasons you follow..."
              className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-fav" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Favorite Housemate
            </label>
            <select
              id="profile-fav"
              value={favoriteHousemateId}
              onChange={(e) => setFavoriteHousemateId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-950 dark:text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="">None selected</option>
              {housemates.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.fullName} ({h.nickname})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 dark:border-white/10 pt-4">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-zinc-900 dark:text-white">Interface Theme</p>
              <p className="text-[11px] text-zinc-500">Switch between Dark and Light mode</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 pt-2 cursor-pointer">
            <div>
              <p className="text-xs font-medium text-zinc-900 dark:text-white">
                House Update Alerts
              </p>
              <p className="text-[11px] text-zinc-500">
                Receive notifications when new fan polls or livestreams open
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-amber-500 cursor-pointer"
            >
              Send Password Reset Email
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Voting History */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#08173A] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-white">
            Your Fan Poll Activity
          </h2>
          {castVotesList.length === 0 ? (
            <div className="py-6 space-y-3">
              <p className="text-sm text-zinc-500">
                You have not voted in any community fan polls yet.
              </p>
              <Link
                to="/voting"
                className="inline-flex rounded-lg bg-zinc-950 dark:bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:hover:bg-white/20"
              >
                Explore Active Polls
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-white/10">
              {castVotesList.map((vote) => {
                const poll = fanPolls.find((p) => p.id === vote.pollId);
                const hm = housemates.find((h) => h.id === vote.housemateId);
                return (
                  <div key={vote.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {poll?.title || vote.pollId}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Voted for {hm?.fullName || vote.housemateId}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
