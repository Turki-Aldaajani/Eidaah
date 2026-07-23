// اختبارات صفحة المادة (مهمة F2): عرض الشرح المخزَّن أو بديل الفاضية
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MaterialView from './MaterialView';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/supabaseClient', () => ({ isSupabaseConfigured: jest.fn(() => true) }));
jest.mock('../lib/library', () => ({ fetchMaterialWithContent: jest.fn() }));

const { useAuth } = require('../auth/AuthContext');
const { isSupabaseConfigured } = require('../lib/supabaseClient');
const { fetchMaterialWithContent } = require('../lib/library');

function renderMaterial(id = 'm1') {
  return render(
    <MemoryRouter initialEntries={[`/library/${id}`]}>
      <ThemeProvider>
        <Routes>
          <Route path="/library/:materialId" element={<MaterialView />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ session: null, account: null });
  isSupabaseConfigured.mockReturnValue(true);
  fetchMaterialWithContent.mockResolvedValue(null);
});

test('مادة معالَجة: تعرض التلخيص والمواضيع مباشرة (بلا رفع ولا زر تحليل)', async () => {
  fetchMaterialWithContent.mockResolvedValue({
    id: 'm1',
    title: 'مقدمة في قواعد البيانات العلائقية',
    college: 'كلية الحاسب',
    level: 3,
    isProcessed: true,
    summary: 'المادة تشرح النموذج العلائقي وSQL.',
    slideCount: 4,
    topics: [
      { topic_order: 0, label: 'النموذج العلائقي', explanation: 'شرح النموذج', example: 'جدول الطلاب' },
      { topic_order: 1, label: 'لغة SQL', explanation: 'شرح SQL', example: 'استعلام SELECT' },
    ],
  });
  renderMaterial();

  expect(await screen.findByText('ملخّص المادة')).toBeInTheDocument();
  expect(screen.getByText('المادة تشرح النموذج العلائقي وSQL.')).toBeInTheDocument();
  expect(screen.getByText('النموذج العلائقي')).toBeInTheDocument();
  expect(screen.getByText('شرح SQL')).toBeInTheDocument();
  // لا يوجد زر «حلّل ملفاتك بنفسك» لأن المحتوى مخزَّن (صفر Groq، صفر رفع)
  expect(screen.queryByText('حلّل ملفاتك بنفسك')).not.toBeInTheDocument();
});

test('مادة غير معالَجة: تعرض بديل التحليل المباشر', async () => {
  fetchMaterialWithContent.mockResolvedValue({
    id: 'm2',
    title: 'مادة فارغة',
    isProcessed: false,
    summary: null,
    slideCount: 0,
    topics: [],
  });
  renderMaterial('m2');

  expect(await screen.findByText('هذه المادة لم تُعالَج بعد')).toBeInTheDocument();
  expect(screen.getByText('حلّل ملفاتك بنفسك').closest('a')).toHaveAttribute('href', '/analyze');
});

test('مادة غير موجودة: تعرض رسالة ورابط رجوع للمكتبة', async () => {
  fetchMaterialWithContent.mockResolvedValue(null);
  renderMaterial('missing');

  expect(await screen.findByText('المادة غير موجودة')).toBeInTheDocument();
  expect(screen.getByText('رجوع للمكتبة').closest('a')).toHaveAttribute('href', '/library');
});

test('خطأ التحميل يظهر للمستخدم', async () => {
  fetchMaterialWithContent.mockRejectedValue(new Error('تعذّر تحميل المادة: down'));
  renderMaterial();

  expect(await screen.findByRole('alert')).toHaveTextContent(/تعذّر تحميل المادة/);
});
