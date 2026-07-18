// اختبارات وحدة مصادقة OTP (مهمة I1)
jest.mock('./supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabaseClient } = require('./supabaseClient');
const {
  normalizeEmail,
  isValidEmail,
  accountTypeFor,
  sendOtpCode,
  verifyOtpCode,
  signOut,
  getCurrentSession,
} = require('./auth');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('تمييز نوع الحساب من نطاق الإيميل', () => {
  test('إيميل جامعة الإمام يفتح حساباً جامعياً باسم الجامعة', () => {
    expect(accountTypeFor('student@imamu.edu.sa')).toEqual({
      type: 'university',
      university: 'جامعة الإمام محمد بن سعود الإسلامية',
    });
  });

  test('أي نطاق .edu.sa يُعد جامعياً حتى لو غير معروف بالاسم', () => {
    expect(accountTypeFor('x@unknown-uni.edu.sa')).toEqual({
      type: 'university',
      university: null,
    });
  });

  test('الإيميل العادي يدخل بالتجربة الحرة', () => {
    expect(accountTypeFor('someone@gmail.com')).toEqual({ type: 'free' });
  });

  test('التمييز يتجاهل حالة الأحرف والمسافات', () => {
    expect(accountTypeFor('  Student@IMAMU.edu.sa  ').type).toBe('university');
  });
});

describe('التحقق من صيغة الإيميل', () => {
  test.each(['a@b.co', 'student@imamu.edu.sa'])('%s صحيح', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  test.each(['', 'no-at.com', 'a@b', 'a b@c.com'])('%s غير صحيح', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  test('normalizeEmail يوحّد الحالة ويقص المسافات', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('sendOtpCode — إرسال الرمز', () => {
  test('يستدعي signInWithOtp بالإيميل الموحّد مع إنشاء الحساب تلقائياً', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: null });
    getSupabaseClient.mockReturnValue({ auth: { signInWithOtp } });

    await expect(sendOtpCode(' Student@Imamu.edu.sa ')).resolves.toEqual({
      email: 'student@imamu.edu.sa',
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'student@imamu.edu.sa',
      options: { shouldCreateUser: true },
    });
  });

  test('يرفض إيميلاً غير صحيح قبل أي استدعاء للشبكة', async () => {
    await expect(sendOtpCode('ليس-إيميل')).rejects.toThrow(/بريداً إلكترونياً صحيحاً/);
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });

  test('يترجم خطأ Supabase لرسالة عربية', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: { message: 'rate limit' } });
    getSupabaseClient.mockReturnValue({ auth: { signInWithOtp } });

    await expect(sendOtpCode('a@b.co')).rejects.toThrow(/تعذّر إرسال رمز التحقق: rate limit/);
  });

  test('خطأ السيرفر برسالة فارغة "{}" (مثل فشل SMTP) يظهر بوصف مفهوم', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: { message: '{}', status: 500 } });
    getSupabaseClient.mockReturnValue({ auth: { signInWithOtp } });

    await expect(sendOtpCode('a@b.co')).rejects.toThrow(/خطأ من الخادم \(500\)/);
  });
});

describe('verifyOtpCode — التحقق من الرمز', () => {
  test('يستدعي verifyOtp بنوع email ويرجع الجلسة', async () => {
    const session = { access_token: 'tok', user: { email: 'a@b.co' } };
    const verifyOtp = jest.fn().mockResolvedValue({ data: { session }, error: null });
    getSupabaseClient.mockReturnValue({ auth: { verifyOtp } });

    await expect(verifyOtpCode('A@b.co', ' 123456 ')).resolves.toBe(session);
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      token: '123456',
      type: 'email',
    });
  });

  test('يرفض رمزاً فارغاً قبل أي استدعاء للشبكة', async () => {
    await expect(verifyOtpCode('a@b.co', '')).rejects.toThrow(/أدخل رمز التحقق/);
    expect(getSupabaseClient).not.toHaveBeenCalled();
  });

  test('رمز خاطئ يعطي رسالة عربية واضحة', async () => {
    const verifyOtp = jest.fn().mockResolvedValue({ data: {}, error: { message: 'invalid' } });
    getSupabaseClient.mockReturnValue({ auth: { verifyOtp } });

    await expect(verifyOtpCode('a@b.co', '000000')).rejects.toThrow(/رمز غير صحيح أو منتهي/);
  });
});

describe('الجلسة والخروج', () => {
  test('getCurrentSession ترجع الجلسة المخزنة (البقاء بعد إعادة التحميل)', async () => {
    const session = { access_token: 'tok' };
    const getSession = jest.fn().mockResolvedValue({ data: { session } });
    getSupabaseClient.mockReturnValue({ auth: { getSession } });

    await expect(getCurrentSession()).resolves.toBe(session);
  });

  test('getCurrentSession ترجع null بدون جلسة', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null } });
    getSupabaseClient.mockReturnValue({ auth: { getSession } });

    await expect(getCurrentSession()).resolves.toBeNull();
  });

  test('signOut يستدعي تسجيل الخروج في Supabase', async () => {
    const supabaseSignOut = jest.fn().mockResolvedValue({ error: null });
    getSupabaseClient.mockReturnValue({ auth: { signOut: supabaseSignOut } });

    await expect(signOut()).resolves.toBeUndefined();
    expect(supabaseSignOut).toHaveBeenCalled();
  });
});
