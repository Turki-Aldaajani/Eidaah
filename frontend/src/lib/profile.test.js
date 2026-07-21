// اختبارات طبقة بيانات الملف الشخصي (مهمة F1)
jest.mock('./supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabaseClient } = require('./supabaseClient');
const {
  isProfileComplete,
  markOnboardingSkipped,
  hasSkippedOnboarding,
  clearOnboardingSkip,
  fetchProfile,
  saveProfile,
} = require('./profile');

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('isProfileComplete', () => {
  test('مكتمل عند وجود الجامعة والمستوى', () => {
    expect(isProfileComplete({ university: 'جامعة الإمام', level: 3 })).toBe(true);
  });

  test('ناقص بدون مستوى أو بدون جامعة أو بلا ملف', () => {
    expect(isProfileComplete({ university: 'جامعة الإمام' })).toBe(false);
    expect(isProfileComplete({ level: 3 })).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });
});

describe('تذكّر تخطّي الأونبوردنق', () => {
  test('markOnboardingSkipped ثم hasSkippedOnboarding لنفس المستخدم', () => {
    expect(hasSkippedOnboarding('user-1')).toBe(false);
    markOnboardingSkipped('user-1');
    expect(hasSkippedOnboarding('user-1')).toBe(true);
    expect(hasSkippedOnboarding('user-2')).toBe(false);
  });

  test('clearOnboardingSkip يلغي العلامة', () => {
    markOnboardingSkipped('user-1');
    clearOnboardingSkip('user-1');
    expect(hasSkippedOnboarding('user-1')).toBe(false);
  });
});

describe('fetchProfile', () => {
  function mockClient(user, result) {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    getSupabaseClient.mockReturnValue({
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    });
    return { from, eq };
  }

  test('ترجع صف المستخدم من جدول profiles', async () => {
    const row = { id: 'u1', university: 'جامعة الإمام', level: 3 };
    const { from, eq } = mockClient({ id: 'u1' }, { data: row, error: null });
    await expect(fetchProfile()).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  test('ترجع null بدون جلسة', async () => {
    mockClient(null, { data: null, error: null });
    await expect(fetchProfile()).resolves.toBeNull();
  });

  test('ترمي خطأ عربياً عند فشل القراءة', async () => {
    mockClient({ id: 'u1' }, { data: null, error: { message: 'boom' } });
    await expect(fetchProfile()).rejects.toThrow(/تعذّر تحميل الملف الشخصي: boom/);
  });
});

describe('saveProfile', () => {
  function mockSaveClient(user, result) {
    const single = jest.fn().mockResolvedValue(result);
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ upsert }));
    getSupabaseClient.mockReturnValue({
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    });
    return { upsert };
  }

  test('ترفض الحفظ بدون جلسة', async () => {
    mockSaveClient(null, { data: null, error: null });
    await expect(saveProfile({ university: 'x' })).rejects.toThrow(/يجب تسجيل الدخول/);
  });

  test('تطبّع الحقول: قص النص، الفارغ→null، المستوى رقم', async () => {
    const saved = { id: 'u1', university: 'جامعة الإمام', college: null, major: null, level: 3 };
    const { upsert } = mockSaveClient({ id: 'u1' }, { data: saved, error: null });

    const result = await saveProfile({
      university: '  جامعة الإمام  ',
      college: '   ',
      major: '',
      level: '3',
    });

    expect(result).toEqual(saved);
    expect(upsert).toHaveBeenCalledWith(
      {
        id: 'u1',
        university: 'جامعة الإمام',
        college: null,
        major: null,
        level: 3,
      },
      { onConflict: 'id' }
    );
  });

  test('تحفظ الحقول الممرّرة فقط (تحديث جزئي)', async () => {
    const saved = { id: 'u1', level: 5 };
    const { upsert } = mockSaveClient({ id: 'u1' }, { data: saved, error: null });

    await saveProfile({ level: 5 });

    expect(upsert).toHaveBeenCalledWith({ id: 'u1', level: 5 }, { onConflict: 'id' });
    const payload = upsert.mock.calls[0][0];
    expect(payload).not.toHaveProperty('university');
  });

  test('ترمي خطأ عربياً عند فشل الحفظ', async () => {
    mockSaveClient({ id: 'u1' }, { data: null, error: { message: 'denied' } });
    await expect(saveProfile({ level: 2 })).rejects.toThrow(/تعذّر حفظ البيانات: denied/);
  });
});
