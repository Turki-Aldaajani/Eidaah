// اختبارات طبقة استعلامات المكتبة (مهمة F2)
jest.mock('./supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

const { getSupabaseClient } = require('./supabaseClient');
const { fetchLibraryMaterials, fetchMaterialWithContent } = require('./library');

// باني استعلام مسلسل: كل دالة ترجع الكائن نفسه الذي يحمل data/error،
// و await على كائن غير-thenable يعيده كما هو فتُفكَّك منه {data, error}.
function tableQuery(result) {
  const q = { data: result.data ?? null, error: result.error ?? null };
  for (const m of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
    q[m] = jest.fn(() => q);
  }
  return q;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchLibraryMaterials', () => {
  test('تفلتر حسب الجامعة وترجع المواد', async () => {
    const rows = [{ id: 'm1', title: 'مادة', university: 'جامعة الإمام' }];
    const q = tableQuery({ data: rows });
    const from = jest.fn(() => q);
    getSupabaseClient.mockReturnValue({ from });

    const result = await fetchLibraryMaterials({ university: 'جامعة الإمام' });

    expect(result).toEqual(rows);
    expect(from).toHaveBeenCalledWith('materials');
    expect(q.eq).toHaveBeenCalledWith('university', 'جامعة الإمام');
  });

  test('بدون جامعة لا تضيف فلتر eq', async () => {
    const q = tableQuery({ data: [] });
    getSupabaseClient.mockReturnValue({ from: () => q });

    await fetchLibraryMaterials({});

    expect(q.eq).not.toHaveBeenCalled();
  });

  test('ترمي خطأ عربياً عند الفشل', async () => {
    const q = tableQuery({ data: null, error: { message: 'boom' } });
    getSupabaseClient.mockReturnValue({ from: () => q });

    await expect(fetchLibraryMaterials({})).rejects.toThrow(/تعذّر تحميل مواد المكتبة: boom/);
  });
});

describe('fetchMaterialWithContent', () => {
  function mockClient({ material, content, topics }) {
    const tables = {
      materials: tableQuery({ data: material }),
      material_content: tableQuery({ data: content }),
      material_topics: tableQuery({ data: topics }),
    };
    getSupabaseClient.mockReturnValue({ from: jest.fn((name) => tables[name]) });
    return tables;
  }

  test('مادة معالَجة: تجمّع التلخيص والمواضيع وتضبط isProcessed=true', async () => {
    mockClient({
      material: { id: 'm1', title: 'قواعد بيانات', processing_status: 'processed' },
      content: { summary: 'تلخيص', slide_count: 4 },
      topics: [
        { topic_order: 0, label: 'النموذج العلائقي', explanation: 'شرح', example: 'مثال' },
      ],
    });

    const view = await fetchMaterialWithContent('m1');

    expect(view.isProcessed).toBe(true);
    expect(view.summary).toBe('تلخيص');
    expect(view.slideCount).toBe(4);
    expect(view.topics).toHaveLength(1);
  });

  test('مادة بلا مواضيع: isProcessed=false حتى لو الحالة processed', async () => {
    mockClient({
      material: { id: 'm1', title: 'مادة', processing_status: 'processed' },
      content: null,
      topics: [],
    });

    const view = await fetchMaterialWithContent('m1');

    expect(view.isProcessed).toBe(false);
    expect(view.summary).toBeNull();
    expect(view.topics).toEqual([]);
  });

  test('مادة غير موجودة ترجع null', async () => {
    mockClient({ material: null, content: null, topics: [] });
    await expect(fetchMaterialWithContent('nope')).resolves.toBeNull();
  });
});
