// اختبارات طبقة بيانات النقاط (مهمة F6)
jest.mock('./supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabaseClient } = require('./supabaseClient');
const {
  POINTS_BY_REASON,
  LEVELS,
  levelForBalance,
  pointsForReason,
  fetchPointsBalance,
  awardPoints,
} = require('./points');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('levelForBalance — ثلاثة مستويات', () => {
  test('يوجد بالضبط ثلاثة مستويات', () => {
    expect(LEVELS).toHaveLength(3);
  });

  test('الرصيد الصغير في المستوى الأول', () => {
    expect(levelForBalance(0).level).toBe(1);
    expect(levelForBalance(LEVELS[1].min - 1).level).toBe(1);
  });

  test('يرتقي عند بلوغ حد كل مستوى', () => {
    expect(levelForBalance(LEVELS[1].min).level).toBe(2);
    expect(levelForBalance(LEVELS[2].min).level).toBe(3);
    expect(levelForBalance(LEVELS[2].min + 999).level).toBe(3);
  });

  test('رصيد غير صالح يُعامل كصفر', () => {
    expect(levelForBalance(undefined).level).toBe(1);
    expect(levelForBalance(NaN).level).toBe(1);
  });
});

describe('pointsForReason', () => {
  test('يرجع النقاط للأسباب المعروفة', () => {
    expect(pointsForReason('completed_quiz_round')).toBe(POINTS_BY_REASON.completed_quiz_round);
    expect(pointsForReason('completed_material')).toBe(POINTS_BY_REASON.completed_material);
    expect(POINTS_BY_REASON.completed_quiz_round).toBeGreaterThan(0);
  });

  test('يرجع صفراً لسبب مجهول', () => {
    expect(pointsForReason('unknown_reason')).toBe(0);
    expect(pointsForReason(undefined)).toBe(0);
  });
});

describe('fetchPointsBalance', () => {
  function mockClient(user, result) {
    const eq = jest.fn().mockResolvedValue(result);
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    getSupabaseClient.mockReturnValue({
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    });
    return { from, eq };
  }

  test('يجمع نقاط صفوف المستخدم', async () => {
    const { from, eq } = mockClient(
      { id: 'u1' },
      { data: [{ points: 10 }, { points: 25 }, { points: 10 }], error: null }
    );
    await expect(fetchPointsBalance()).resolves.toBe(45);
    expect(from).toHaveBeenCalledWith('points_ledger');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  test('يرجع صفراً بلا صفوف', async () => {
    mockClient({ id: 'u1' }, { data: [], error: null });
    await expect(fetchPointsBalance()).resolves.toBe(0);
  });

  test('يرجع صفراً بدون جلسة', async () => {
    mockClient(null, { data: null, error: null });
    await expect(fetchPointsBalance()).resolves.toBe(0);
  });

  test('يرمي خطأ عربياً عند فشل القراءة', async () => {
    mockClient({ id: 'u1' }, { data: null, error: { message: 'boom' } });
    await expect(fetchPointsBalance()).rejects.toThrow(/تعذّر تحميل رصيد النقاط: boom/);
  });
});

describe('awardPoints', () => {
  function mockClient(user, result) {
    const insert = jest.fn().mockResolvedValue(result);
    const from = jest.fn(() => ({ insert }));
    getSupabaseClient.mockReturnValue({
      from,
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    });
    return { from, insert };
  }

  test('يسجّل صفاً بنقاط السبب ويرجعها', async () => {
    const { from, insert } = mockClient({ id: 'u1' }, { error: null });
    const awarded = await awardPoints('completed_quiz_round', { materialId: 'm1' });
    expect(awarded).toBe(POINTS_BY_REASON.completed_quiz_round);
    expect(from).toHaveBeenCalledWith('points_ledger');
    expect(insert).toHaveBeenCalledWith({
      user_id: 'u1',
      points: POINTS_BY_REASON.completed_quiz_round,
      reason: 'completed_quiz_round',
      material_id: 'm1',
    });
  });

  test('لا يسجّل شيئاً لسبب مجهول', async () => {
    const { insert } = mockClient({ id: 'u1' }, { error: null });
    await expect(awardPoints('nope')).resolves.toBe(0);
    expect(insert).not.toHaveBeenCalled();
  });

  test('لا يسجّل شيئاً بدون جلسة', async () => {
    const { insert } = mockClient(null, { error: null });
    await expect(awardPoints('completed_quiz_round')).resolves.toBe(0);
    expect(insert).not.toHaveBeenCalled();
  });

  test('يرمي خطأ عربياً عند فشل التسجيل', async () => {
    mockClient({ id: 'u1' }, { error: { message: 'denied' } });
    await expect(awardPoints('completed_quiz_round')).rejects.toThrow(/تعذّر تسجيل النقاط: denied/);
  });
});
