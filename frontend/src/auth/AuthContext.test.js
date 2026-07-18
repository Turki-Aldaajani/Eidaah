// اختبارات سياق الجلسة (مهمة I1): الاستعادة بعد إعادة التحميل ودورة الخروج
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Login from '../pages/Login';
import { ThemeProvider } from '../theme/ThemeContext';
import { AuthProvider } from './AuthContext';

jest.mock('../lib/auth', () => ({
  sendOtpCode: jest.fn(),
  verifyOtpCode: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  getCurrentSession: jest.fn(),
  onAuthChange: jest.fn(() => () => {}),
  accountTypeFor: jest.requireActual('../lib/auth').accountTypeFor,
}));
jest.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabaseClient: jest.fn(),
}));

const { getCurrentSession, signOut, onAuthChange } = require('../lib/auth');
const { isSupabaseConfigured } = require('../lib/supabaseClient');

function renderWithAuth(ui) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  // CRA يفعّل resetMocks — نعيد ضبط التنفيذات قبل كل اختبار
  isSupabaseConfigured.mockReturnValue(true);
  onAuthChange.mockImplementation(() => () => {});
  signOut.mockResolvedValue(undefined);
});

test('بدون جلسة: TopNav يعرض رابط تسجيل الدخول إلى /login', async () => {
  getCurrentSession.mockResolvedValue(null);
  renderWithAuth(<TopNav />);

  const link = await screen.findByText('تسجيل الدخول');
  expect(link.closest('a')).toHaveAttribute('href', '/login');
});

test('الجلسة المخزنة تُستعاد بعد إعادة التحميل ويظهر الإيميل في TopNav', async () => {
  getCurrentSession.mockResolvedValue({ user: { email: 'student@imamu.edu.sa' } });
  renderWithAuth(<TopNav />);

  expect(await screen.findByText('student@imamu.edu.sa')).toBeInTheDocument();
  expect(screen.getByText('جامعي')).toBeInTheDocument();
});

test('الإيميل غير الجامعي لا يحمل شارة جامعي', async () => {
  getCurrentSession.mockResolvedValue({ user: { email: 'someone@gmail.com' } });
  renderWithAuth(<TopNav />);

  expect(await screen.findByText('someone@gmail.com')).toBeInTheDocument();
  expect(screen.queryByText('جامعي')).toBeNull();
});

test('المسجّل يرى حالته في صفحة الدخول وزر الخروج يستدعي signOut', async () => {
  getCurrentSession.mockResolvedValue({ user: { email: 'student@imamu.edu.sa' } });
  renderWithAuth(<Login />);

  expect(await screen.findByText('أنت مسجّل الدخول')).toBeInTheDocument();
  expect(screen.getByText(/حساب جامعي/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));
  await waitFor(() => expect(signOut).toHaveBeenCalled());
});
