// اختبارات طبقة الحوكمة (مهمة I2)
jest.mock('./supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
  submitMaterialRequest: jest.fn(),
}));

const { getSupabaseClient } = require('./supabaseClient');
const { fetchPendingRequests, approveRequest, rejectRequest } = require('./governance');

function q(result) {
  const obj = {};
  for (const m of ['select', 'eq', 'order', 'insert', 'update', 'single']) {
    obj[m] = jest.fn(() => obj);
  }
  obj.then = (resolve) => resolve({ data: result.data ?? null, error: result.error ?? null });
  return obj;
}

function client(user, from) {
  return { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) } };
}

beforeEach(() => jest.clearAllMocks());

describe('fetchPendingRequests', () => {
  test('يرجع الطلبات المعلّقة', async () => {
    const query = q({ data: [{ id: 'r1', title: 'مادة', status: 'pending' }] });
    const from = jest.fn(() => query);
    getSupabaseClient.mockReturnValue(client({ id: 'admin' }, from));

    await expect(fetchPendingRequests()).resolves.toHaveLength(1);
    expect(from).toHaveBeenCalledWith('material_requests');
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
  });

  test('خطأ عربي عند الفشل', async () => {
    getSupabaseClient.mockReturnValue(client({ id: 'admin' }, () => q({ error: { message: 'no' } })));
    await expect(fetchPendingRequests()).rejects.toThrow(/تعذّر تحميل الطلبات: no/);
  });
});

describe('approveRequest', () => {
  test('يُدرج المادة في المكتبة ثم يعلّم الطلب approved', async () => {
    const matQ = q({ data: { id: 'mat-1' } });
    const reqQ = q({ error: null });
    const from = jest.fn().mockReturnValueOnce(matQ).mockReturnValueOnce(reqQ);
    getSupabaseClient.mockReturnValue(client({ id: 'admin' }, from));

    const req = { id: 'req-1', title: 'قواعد بيانات', description: 'د', university: 'جامعة', level: 3 };
    const materialId = await approveRequest(req);

    expect(materialId).toBe('mat-1');
    expect(from).toHaveBeenNthCalledWith(1, 'materials');
    expect(matQ.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'قواعد بيانات', scope: 'library', processing_status: 'pending' })
    );
    expect(from).toHaveBeenNthCalledWith(2, 'material_requests');
    expect(reqQ.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', material_id: 'mat-1' })
    );
    expect(reqQ.eq).toHaveBeenCalledWith('id', 'req-1');
  });

  test('يفشل بوضوح إن تعذّر إنشاء المادة', async () => {
    const matQ = q({ data: null, error: { message: 'denied' } });
    const from = jest.fn(() => matQ);
    getSupabaseClient.mockReturnValue(client({ id: 'admin' }, from));

    await expect(approveRequest({ id: 'r', title: 't' })).rejects.toThrow(/تعذّر إنشاء المادة: denied/);
  });
});

describe('rejectRequest', () => {
  test('يعلّم الطلب rejected مع سبب', async () => {
    const reqQ = q({ error: null });
    const from = jest.fn(() => reqQ);
    getSupabaseClient.mockReturnValue(client({ id: 'admin' }, from));

    await rejectRequest('req-1', 'خارج النطاق');

    expect(reqQ.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected', review_note: 'خارج النطاق' })
    );
    expect(reqQ.eq).toHaveBeenCalledWith('id', 'req-1');
  });
});
