// اختبارات صفحة المكتبة (مهمة F2)
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Library from './Library';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../profile/ProfileContext', () => ({ useProfile: jest.fn() }));
jest.mock('../lib/supabaseClient', () => ({ isSupabaseConfigured: jest.fn(() => true) }));
jest.mock('../lib/library', () => ({ fetchLibraryMaterials: jest.fn() }));

const { useAuth } = require('../auth/AuthContext');
const { useProfile } = require('../profile/ProfileContext');
const { isSupabaseConfigured } = require('../lib/supabaseClient');
const { fetchLibraryMaterials } = require('../lib/library');

function renderLibrary() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Library />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ session: null, account: null });
  useProfile.mockReturnValue({ profile: { university: 'جامعة الإمام محمد بن سعود الإسلامية' } });
  isSupabaseConfigured.mockReturnValue(true);
  fetchLibraryMaterials.mockResolvedValue([]);
});

test('تفلتر المواد حسب جامعة الطالب من الأونبوردنق', async () => {
  fetchLibraryMaterials.mockResolvedValue([
    { id: 'm1', title: 'قواعد البيانات العلائقية', college: 'كلية الحاسب', level: 3, processing_status: 'processed' },
  ]);
  renderLibrary();

  expect(await screen.findByText('قواعد البيانات العلائقية')).toBeInTheDocument();
  expect(fetchLibraryMaterials).toHaveBeenCalledWith({
    university: 'جامعة الإمام محمد بن سعود الإسلامية',
  });
  // بطاقة المادة المعالَجة تحمل رابطاً وشارة «جاهزة»
  expect(screen.getByText('قواعد البيانات العلائقية').closest('a')).toHaveAttribute(
    'href',
    '/library/m1'
  );
  expect(screen.getByText('جاهزة')).toBeInTheDocument();
});

test('حالة فارغة تعرض زر التحليل المباشر', async () => {
  fetchLibraryMaterials.mockResolvedValue([]);
  renderLibrary();

  expect(await screen.findByText('لا توجد مواد جاهزة بعد')).toBeInTheDocument();
  const cta = screen.getByText('حلّل ملفاتك بنفسك').closest('a');
  expect(cta).toHaveAttribute('href', '/analyze');
});

test('بدون جامعة في الملف تُطلب المواد بلا فلتر', async () => {
  useProfile.mockReturnValue({ profile: null });
  renderLibrary();

  await waitFor(() =>
    expect(fetchLibraryMaterials).toHaveBeenCalledWith({ university: null })
  );
});

test('تعرض خطأ التحميل', async () => {
  fetchLibraryMaterials.mockRejectedValue(new Error('تعذّر تحميل مواد المكتبة: down'));
  renderLibrary();

  expect(await screen.findByRole('alert')).toHaveTextContent(/تعذّر تحميل مواد المكتبة/);
});
