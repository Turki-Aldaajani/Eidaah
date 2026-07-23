// سياق النقاط (مهمة F6): مصدر واحد لرصيد النقاط والمستوى في الواجهة.
// يحمّل الرصيد عند وجود جلسة، وكسب النقاط يحدّث الرصيد فوراً (تحديث متفائل)
// حتى ينعكس على الويدجت مباشرةً — وهو شرط معيار القبول «يزيد الرصيد فوراً».
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import {
  fetchPointsBalance,
  awardPoints as persistPoints,
  levelForBalance,
  pointsForReason,
} from '../lib/points';

const PointsContext = createContext({
  balance: 0,
  level: levelForBalance(0),
  loading: false,
  award: async () => 0,
  refresh: async () => {},
});

export function PointsProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured() || !userId) {
      setBalance(0);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchPointsBalance()
      .then((b) => {
        if (active) setBalance(b);
      })
      .catch(() => {
        if (active) setBalance(0);
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
    try {
      setBalance(await fetchPointsBalance());
    } catch {
      /* نُبقي الرصيد الحالي عند فشل التحديث */
    }
  }, [userId]);

  // كسب النقاط: تحديث متفائل فوري للرصيد ثم التخزين. عند فشل التخزين
  // نتراجع عن الزيادة حتى لا نعرض رصيداً لم يُسجَّل فعلاً.
  const award = useCallback(
    async (reason, opts = {}) => {
      if (!isSupabaseConfigured() || !userId) return 0;
      const optimistic = pointsForReason(reason);
      if (optimistic <= 0) return 0;
      setBalance((b) => b + optimistic); // ينعكس فوراً على الويدجت
      try {
        const awarded = await persistPoints(reason, opts);
        if (awarded !== optimistic) {
          // صحّح التقدير إذا اختلف المُسجَّل عن المتوقّع (مثلاً لا جلسة)
          setBalance((b) => b - optimistic + awarded);
        }
        return awarded;
      } catch {
        setBalance((b) => b - optimistic); // تراجع عند فشل التخزين
        return 0;
      }
    },
    [userId]
  );

  const level = levelForBalance(balance);

  return (
    <PointsContext.Provider value={{ balance, level, loading, award, refresh }}>
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  return useContext(PointsContext);
}
