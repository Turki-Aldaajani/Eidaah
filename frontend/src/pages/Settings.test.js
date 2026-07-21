// اختبارات صفحة الإعدادات (مهمة F1): التعديل والحفظ والانعكاس الفوري
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../profile/ProfileContext', () => ({ useProfile: jest.fn() }));

const { useAuth } = require('../auth/AuthContext');
const { useProfile } = require('../profile/ProfileContext');

function renderSettings() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Settings />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } } });
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الإمام', college: 'كلية الحاسب', major: 'علوم حاسب', level: 3 },
    saveProfile: jest.fn().mockResolvedValue({}),
  });
});

test('تعبّئ الحقول من الملف الحالي وتعرض ملخص البيانات', () => {
  renderSettings();
  expect(screen.getByLabelText('الجامعة')).toHaveValue('جامعة الإمام');
  expect(screen.getByLabelText('التخصص')).toHaveValue('علوم حاسب');
  expect(screen.getByLabelText('المستوى الدراسي')).toHaveValue('3');

  const summary = screen.getByTestId('profile-summary');
  expect(summary).toHaveTextContent('جامعة الإمام');
  expect(summary).toHaveTextContent('المستوى الثالث');
});

test('الحفظ يستدعي saveProfile بالحقول المعدّلة ويعرض تأكيداً', async () => {
  const saveProfile = jest.fn().mockResolvedValue({});
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الإمام', college: '', major: '', level: 3 },
    saveProfile,
  });
  renderSettings();

  fireEvent.change(screen.getByLabelText('التخصص'), { target: { value: 'هندسة برمجيات' } });
  fireEvent.change(screen.getByLabelText('المستوى الدراسي'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

  await waitFor(() =>
    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ major: 'هندسة برمجيات', level: '5' })
    )
  );
  expect(await screen.findByText(/حُفظت بياناتك/)).toBeInTheDocument();
});

test('التعديل ينعكس فوراً: الملخص يتبع بيانات السياق المحدّثة', () => {
  const { rerender } = renderSettings();
  expect(screen.getByTestId('profile-summary')).toHaveTextContent('المستوى الثالث');

  // محاكاة تحديث السياق بعد الحفظ (saveProfile يحدّث profile)
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الملك سعود', college: '', major: '', level: 6 },
    saveProfile: jest.fn(),
  });
  rerender(
    <MemoryRouter>
      <ThemeProvider>
        <Settings />
      </ThemeProvider>
    </MemoryRouter>
  );

  const summary = screen.getByTestId('profile-summary');
  expect(summary).toHaveTextContent('جامعة الملك سعود');
  expect(summary).toHaveTextContent('المستوى السادس');
});

test('خطأ الحفظ يظهر للمستخدم', async () => {
  const saveProfile = jest.fn().mockRejectedValue(new Error('تعذّر حفظ البيانات: denied'));
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الإمام', level: 3 },
    saveProfile,
  });
  renderSettings();

  fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/تعذّر حفظ البيانات/);
});

test('بدون جلسة لا تعرض النموذج (يوجّه للدخول)', () => {
  useAuth.mockReturnValue({ session: null });
  renderSettings();
  expect(screen.queryByLabelText('الجامعة')).not.toBeInTheDocument();
});
