// سياق الملف الشخصي (مهمة F1): مصدر واحد لبيانات profiles في الواجهة.
// يحمّل الصف عند وجود جلسة، ويكشف هل يحتاج المستخدم أونبوردنق،
// والحفظ يحدّث الحالة فوراً (شرط «تنعكس فوراً» في معيار القبول).
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  fetchProfile,
  saveProfile as persistProfile,
  isProfileComplete,
  hasSkippedOnboarding,
  markOnboardingSkipped,
} from '../lib/profile';

const ProfileContext = createContext({
  profile: null,
  loading: false,
  needsOnboarding: false,
  saveProfile: async () => {},
  skipOnboarding: () => {},
  refresh: async () => {},
});

export function ProfileProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured() || !userId) {
      setProfile(null);
      setSkipped(false);
      setLoading(false);
      return undefined;
    }
    setSkipped(hasSkippedOnboarding(userId));
    setLoading(true);
    fetchProfile()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) return;
    setLoading(true);
    try {
      setProfile(await fetchProfile());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveProfile = useCallback(async (fields) => {
    const saved = await persistProfile(fields);
    setProfile(saved); // ينعكس فوراً على كل مستهلكي السياق
    return saved;
  }, []);

  const skipOnboarding = useCallback(() => {
    markOnboardingSkipped(userId);
    setSkipped(true);
  }, [userId]);

  const needsOnboarding =
    Boolean(userId) && !loading && !isProfileComplete(profile) && !skipped;

  return (
    <ProfileContext.Provider
      value={{ profile, loading, needsOnboarding, saveProfile, skipOnboarding, refresh }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
