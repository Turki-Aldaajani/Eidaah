// سياق الجلسة (مهمة I1): مصدر واحد لحالة الدخول في كل الواجهة.
// الجلسة تُستعاد تلقائياً بعد إعادة التحميل من تخزين supabase-js.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { getCurrentSession, onAuthChange, accountTypeFor } from '../lib/auth';

// قيمة افتراضية آمنة: تسمح باستخدام المكونات (مثل TopNav) خارج الـ Provider
const AuthContext = createContext({ session: null, loading: false, account: null });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    let active = true;
    getCurrentSession()
      .then((s) => {
        if (active) setSession(s);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const unsubscribe = onAuthChange((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const account = session?.user?.email ? accountTypeFor(session.user.email) : null;

  return (
    <AuthContext.Provider value={{ session, loading, account }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
