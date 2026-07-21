// اختبارات صفحة الأونبوردنق (مهمة F1): التنقل، الحفظ، والتخطي
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Onboarding from './Onboarding';
import { ThemeProvider } from '../theme/ThemeContext';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../profile/ProfileContext', () => ({ useProfile: jest.fn() }));

const { useAuth } = require('../auth/AuthContext');
const { useProfile } = require('../profile/ProfileContext');

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Onboarding />
      </ThemeProvider>
    </MemoryRouter>
  );
}

// عنوان السؤال يظهر كترويسة (heading) — نستهدفه بدوره لتفادي تطابق نص الـ label
const heading = (name) => screen.getByRole('heading', { name });

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } } });
  useProfile.mockReturnValue({
    profile: null,
    saveProfile: jest.fn().mockResolvedValue({ university: 'جامعة الإمام', level: 3 }),
    skipOnboarding: jest.fn(),
  });
});

test('يبدأ بسؤال الجامعة ويعرض عدّاد الخطوات', () => {
  renderOnboarding();
  expect(heading('ما جامعتك؟')).toBeInTheDocument();
  expect(screen.getByText('السؤال 1 من 4')).toBeInTheDocument();
});

test('يتنقّل عبر الخطوات ويحفظ كل الإجابات في النهاية ثم يوجّه للرئيسية', async () => {
  const saveProfile = jest.fn().mockResolvedValue({ university: 'جامعة الإمام', level: 3 });
  useProfile.mockReturnValue({ profile: null, saveProfile, skipOnboarding: jest.fn() });
  renderOnboarding();

  fireEvent.change(screen.getByLabelText('ما جامعتك؟'), { target: { value: 'جامعة الإمام' } });
  fireEvent.click(screen.getByRole('button', { name: /التالي/ }));

  fireEvent.change(screen.getByLabelText('ما كليتك؟'), { target: { value: 'كلية الحاسب' } });
  fireEvent.click(screen.getByRole('button', { name: /التالي/ }));

  fireEvent.change(screen.getByLabelText('ما تخصصك؟'), { target: { value: 'علوم حاسب' } });
  fireEvent.click(screen.getByRole('button', { name: /التالي/ }));

  expect(heading('ما مستواك الدراسي؟')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('ما مستواك الدراسي؟'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'حفظ ودخول' }));

  await waitFor(() =>
    expect(saveProfile).toHaveBeenCalledWith({
      university: 'جامعة الإمام',
      college: 'كلية الحاسب',
      major: 'علوم حاسب',
      level: '3',
    })
  );
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

test('تخطّي خطوة ينتقل دون إدخال قيمة', () => {
  renderOnboarding();
  expect(heading('ما جامعتك؟')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'تخطّي' }));
  expect(heading('ما كليتك؟')).toBeInTheDocument();
});

test('«تخطّي الإعداد» يستدعي skipOnboarding ويوجّه للرئيسية', () => {
  const skipOnboarding = jest.fn();
  useProfile.mockReturnValue({ profile: null, saveProfile: jest.fn(), skipOnboarding });
  renderOnboarding();

  fireEvent.click(screen.getByRole('button', { name: 'تخطّي الإعداد' }));

  expect(skipOnboarding).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

test('إكمال ببيانات ناقصة يُعدّ تخطياً (skipOnboarding)', async () => {
  const saveProfile = jest.fn().mockResolvedValue({ university: '', level: null });
  const skipOnboarding = jest.fn();
  useProfile.mockReturnValue({ profile: null, saveProfile, skipOnboarding });
  renderOnboarding();

  // تخطَّ كل الخطوات حتى الأخيرة ثم احفظ فارغاً
  fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
  fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
  fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
  fireEvent.click(screen.getByRole('button', { name: 'حفظ ودخول' }));

  await waitFor(() => expect(saveProfile).toHaveBeenCalled());
  expect(skipOnboarding).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

test('بدون جلسة لا يعرض الأسئلة (يوجّه للدخول)', () => {
  useAuth.mockReturnValue({ session: null });
  renderOnboarding();
  expect(screen.queryByRole('heading', { name: 'ما جامعتك؟' })).not.toBeInTheDocument();
});
