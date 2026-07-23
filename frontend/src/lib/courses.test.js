// اختبارات طبقة بيانات المقررات (مهمة S2)
jest.mock('./supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabaseClient } = require('./supabaseClient');
const {
  electiveLabel,
  isCourseUnlocked,
  fetchCourseCatalog,
  addCustomCourse,
  fetchStudentCourses,
  selectCourse,
  unselectCourse,
} = require('./courses');

// كائن استعلام قابل للانتظار: كل دالة ترجعه، و await يحلّه إلى {data, error}
function q(result) {
  const obj = {};
  for (const m of ['select', 'eq', 'in', 'order', 'single', 'insert', 'update', 'delete']) {
    obj[m] = jest.fn(() => obj);
  }
  obj.then = (resolve) => resolve({ data: result.data ?? null, error: result.error ?? null });
  return obj;
}

function client({ user = { id: 'u1' }, from = jest.fn() } = {}) {
  return { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) } };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('مساعدات نقية', () => {
  test('electiveLabel', () => {
    expect(electiveLabel('required')).toBe('إجباري');
    expect(electiveLabel('free_elective')).toBe('حر (يحتاج متطلب)');
    expect(electiveLabel('pure_elective')).toBe('اختياري');
  });

  test('isCourseUnlocked: بلا متطلبات دائماً متاح', () => {
    expect(isCourseUnlocked({ prerequisites: [] })).toBe(true);
    expect(isCourseUnlocked({})).toBe(true);
  });

  test('isCourseUnlocked: يتطلب إتمام كل المتطلبات', () => {
    const course = { prerequisites: ['a', 'b'] };
    expect(isCourseUnlocked(course, ['a'])).toBe(false);
    expect(isCourseUnlocked(course, ['a', 'b'])).toBe(true);
  });
});

describe('fetchCourseCatalog', () => {
  test('يدمج المنسّقة + مقررات الطالب ويرفق المتطلبات', async () => {
    const from = jest
      .fn()
      .mockReturnValueOnce(q({ data: [{ id: 'c1', name: 'برمجة', university: 'جامعة الإمام' }] })) // منسّقة
      .mockReturnValueOnce(q({ data: [{ id: 'c9', name: 'مقرر خاص', created_by: 'u1' }] })) // مقررات الطالب
      .mockReturnValueOnce(q({ data: [{ course_id: 'c1', prerequisite_course_id: 'c0' }] })); // متطلبات
    getSupabaseClient.mockReturnValue(client({ from }));

    const catalog = await fetchCourseCatalog({ university: 'جامعة الإمام' });

    expect(catalog).toHaveLength(2);
    const c1 = catalog.find((c) => c.id === 'c1');
    expect(c1.prerequisites).toEqual(['c0']);
    const c9 = catalog.find((c) => c.id === 'c9');
    expect(c9.prerequisites).toEqual([]);
    expect(from).toHaveBeenCalledWith('courses');
    expect(from).toHaveBeenCalledWith('course_prerequisites');
  });
});

describe('addCustomCourse', () => {
  test('يرفض بلا اسم', async () => {
    getSupabaseClient.mockReturnValue(client());
    await expect(addCustomCourse({ name: '  ' })).rejects.toThrow(/اسم المقرر مطلوب/);
  });

  test('يُدرج مقرراً للطالب بـ is_curated=false و created_by', async () => {
    const query = q({ data: { id: 'new', name: 'مقرر خاص' } });
    const from = jest.fn(() => query);
    getSupabaseClient.mockReturnValue(client({ user: { id: 'u1' }, from }));

    const res = await addCustomCourse({ name: 'مقرر خاص', level: 3 });

    expect(res.id).toBe('new');
    expect(res.prerequisites).toEqual([]);
    expect(from).toHaveBeenCalledWith('courses');
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'مقرر خاص', is_curated: false, created_by: 'u1', default_level: 3 })
    );
  });
});

describe('اختيار المقررات', () => {
  test('selectCourse يُدرج في student_courses للمستخدم الحالي', async () => {
    const query = q({ data: { id: 'sc1', status: 'in_progress' } });
    const from = jest.fn(() => query);
    getSupabaseClient.mockReturnValue(client({ user: { id: 'u1' }, from }));

    const res = await selectCourse('c1', '1447-1');

    expect(res.id).toBe('sc1');
    expect(from).toHaveBeenCalledWith('student_courses');
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', course_id: 'c1', term: '1447-1', status: 'in_progress' })
    );
  });

  test('selectCourse يرفض بلا جلسة', async () => {
    getSupabaseClient.mockReturnValue(client({ user: null, from: jest.fn(() => q({})) }));
    await expect(selectCourse('c1', 't')).rejects.toThrow(/سجّل الدخول/);
  });

  test('unselectCourse يحذف باختيار المستخدم والفصل', async () => {
    const query = q({ error: null });
    const from = jest.fn(() => query);
    getSupabaseClient.mockReturnValue(client({ user: { id: 'u1' }, from }));

    await unselectCourse('c1', '1447-1');

    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(query.eq).toHaveBeenCalledWith('course_id', 'c1');
    expect(query.eq).toHaveBeenCalledWith('term', '1447-1');
  });

  test('fetchStudentCourses يرجع اختيار الطالب للفصل', async () => {
    const rows = [{ id: 'sc1', status: 'in_progress', course: { id: 'c1', name: 'برمجة' } }];
    const from = jest.fn(() => q({ data: rows }));
    getSupabaseClient.mockReturnValue(client({ user: { id: 'u1' }, from }));

    const res = await fetchStudentCourses('1447-1');

    expect(res).toEqual(rows);
    expect(from).toHaveBeenCalledWith('student_courses');
  });

  test('fetchStudentCourses بلا جلسة يرجع فارغاً', async () => {
    getSupabaseClient.mockReturnValue(client({ user: null, from: jest.fn(() => q({})) }));
    await expect(fetchStudentCourses('t')).resolves.toEqual([]);
  });
});
