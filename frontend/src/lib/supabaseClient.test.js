// اختبارات عميل Supabase (مهمة G1): عمليتا القراءة والكتابة التجريبيتان.
// التحقق الحي على مشروع Supabase فعلي: npm run supabase:smoke
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const { createClient } = require('@supabase/supabase-js');

const TEST_URL = 'https://test-project.supabase.co';
const TEST_ANON_KEY = 'test-anon-key';

function loadModule() {
  let mod;
  jest.isolateModules(() => {
    mod = require('./supabaseClient');
  });
  return mod;
}

function withEnv() {
  process.env.REACT_APP_SUPABASE_URL = TEST_URL;
  process.env.REACT_APP_SUPABASE_ANON_KEY = TEST_ANON_KEY;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REACT_APP_SUPABASE_URL;
  delete process.env.REACT_APP_SUPABASE_ANON_KEY;
});

describe('تهيئة العميل', () => {
  test('isSupabaseConfigured ترجع false بدون مفاتيح البيئة', () => {
    const { isSupabaseConfigured } = loadModule();
    expect(isSupabaseConfigured()).toBe(false);
  });

  test('getSupabaseClient ترمي خطأ واضحاً بدون مفاتيح البيئة', () => {
    const { getSupabaseClient } = loadModule();
    expect(() => getSupabaseClient()).toThrow(/Supabase غير مهيأ/);
    expect(createClient).not.toHaveBeenCalled();
  });

  test('getSupabaseClient تنشئ العميل بمفاتيح البيئة وتعيد نفس النسخة', () => {
    withEnv();
    const fakeClient = {};
    createClient.mockReturnValue(fakeClient);
    const { getSupabaseClient, isSupabaseConfigured } = loadModule();

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseClient()).toBe(fakeClient);
    expect(getSupabaseClient()).toBe(fakeClient);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(TEST_URL, TEST_ANON_KEY);
  });
});

describe('القراءة التجريبية — fetchMaterials', () => {
  test('تقرأ من جدول materials وترجع الصفوف', async () => {
    withEnv();
    const rows = [{ id: 'm1', title: 'مادة تجريبية', processing_status: 'processed' }];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const select = jest.fn(() => ({ order }));
    const from = jest.fn(() => ({ select }));
    createClient.mockReturnValue({ from });
    const { fetchMaterials } = loadModule();

    await expect(fetchMaterials({ limit: 5 })).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith('materials');
    expect(limit).toHaveBeenCalledWith(5);
  });

  test('ترمي خطأ عربياً واضحاً عند فشل القراءة', async () => {
    withEnv();
    const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const order = jest.fn(() => ({ limit }));
    const select = jest.fn(() => ({ order }));
    createClient.mockReturnValue({ from: () => ({ select }) });
    const { fetchMaterials } = loadModule();

    await expect(fetchMaterials()).rejects.toThrow(/تعذّرت قراءة المواد: boom/);
  });
});

describe('الكتابة التجريبية — submitMaterialRequest', () => {
  function mockClientWithUser(user, insertResult) {
    const single = jest.fn().mockResolvedValue(insertResult);
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    createClient.mockReturnValue({
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    });
    return { from, insert };
  }

  test('الكتابة للمسجلين فقط: ترفض بدون جلسة ولا تُدرج شيئاً', async () => {
    withEnv();
    const { insert } = mockClientWithUser(null, { data: null, error: null });
    const { submitMaterialRequest } = loadModule();

    await expect(submitMaterialRequest({ title: 'مادة' })).rejects.toThrow(
      /الكتابة للمسجلين فقط/
    );
    expect(insert).not.toHaveBeenCalled();
  });

  test('تسجل طلباً بحالة pending باسم المستخدم المسجّل', async () => {
    withEnv();
    const saved = { id: 'req-1', status: 'pending' };
    const { from, insert } = mockClientWithUser(
      { id: 'user-123' },
      { data: saved, error: null }
    );
    const { submitMaterialRequest } = loadModule();

    const result = await submitMaterialRequest({
      title: 'مبادئ قواعد البيانات',
      university: 'جامعة الإمام',
      level: 3,
    });

    expect(result).toEqual(saved);
    expect(from).toHaveBeenCalledWith('material_requests');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        requester_id: 'user-123',
        title: 'مبادئ قواعد البيانات',
        status: 'pending',
      })
    );
  });

  test('ترفض طلباً بدون عنوان', async () => {
    withEnv();
    createClient.mockReturnValue({});
    const { submitMaterialRequest } = loadModule();

    await expect(submitMaterialRequest({})).rejects.toThrow(/عنوان المادة مطلوب/);
  });
});
