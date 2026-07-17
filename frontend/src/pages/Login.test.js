// اختبارات صفحة تسجيل الدخول OTP (مهمة I1): دورة الدخول كاملة بالواجهة
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { ThemeProvider } from '../theme/ThemeContext';
import { AuthProvider } from '../auth/AuthContext';

jest.mock('../lib/auth', () => ({
  sendOtpCode: jest.fn(),
  verifyOtpCode: jest.fn(),
  signOut: jest.fn(),
  getCurrentSession: jest.fn().mockResolvedValue(null),
  onAuthChange: jest.fn(() => () => {}),
  accountTypeFor: jest.requireActual('../lib/auth').accountTypeFor,
}));
jest.mock('../lib/supabaseClient', () => ({
  isSupabaseConfigured: jest.fn(() => false),
  getSupabaseClient: jest.fn(),
}));

const { sendOtpCode, verifyOtpCode } = require('../lib/auth');
const { isSupabaseConfigured } = require('../lib/supabaseClient');

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ThemeProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  // CRA يفعّل resetMocks — نعيد ضبط التنفيذات قبل كل اختبار
  isSupabaseConfigured.mockReturnValue(false);
});

test('تعرض خطوة الإيميل أولاً بدون أي حقل باسوورد', () => {
  renderLogin();
  expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'أرسل رمز التحقق' })).toBeInTheDocument();
  expect(document.querySelector('input[type="password"]')).toBeNull();
});

test('إرسال الإيميل ينقل لخطوة الرمز ويظهر تنبيه الإرسال', async () => {
  sendOtpCode.mockResolvedValue({ email: 'student@imamu.edu.sa' });
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'student@imamu.edu.sa' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));

  expect(await screen.findByLabelText('رمز التحقق')).toBeInTheDocument();
  expect(sendOtpCode).toHaveBeenCalledWith('student@imamu.edu.sa');
  expect(screen.getByText(/أرسلنا رمز التحقق/)).toBeInTheDocument();
});

test('الإيميل الجامعي يُظهر أن مكتبة الجامعة ستُفتح', async () => {
  sendOtpCode.mockResolvedValue({ email: 'student@imamu.edu.sa' });
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'student@imamu.edu.sa' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));

  expect(await screen.findByText(/ستُفتح مكتبة جامعتك/)).toBeInTheDocument();
});

test('الإيميل غير الجامعي يدخل بالتجربة الحرة', async () => {
  sendOtpCode.mockResolvedValue({ email: 'someone@gmail.com' });
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'someone@gmail.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));

  expect(await screen.findByText(/ستدخل بالتجربة الحرة/)).toBeInTheDocument();
});

test('فشل الإرسال يعرض رسالة الخطأ ويبقى بخطوة الإيميل', async () => {
  sendOtpCode.mockRejectedValue(new Error('تعذّر إرسال رمز التحقق: rate limit'));
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'a@b.co' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/rate limit/);
  expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
});

test('إدخال الرمز الصحيح يستدعي التحقق بالإيميل والرمز', async () => {
  sendOtpCode.mockResolvedValue({ email: 'a@b.co' });
  verifyOtpCode.mockResolvedValue({ access_token: 'tok' });
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'a@b.co' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));

  fireEvent.change(await screen.findByLabelText('رمز التحقق'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

  await waitFor(() => expect(verifyOtpCode).toHaveBeenCalledWith('a@b.co', '123456'));
});

test('رمز خاطئ يعرض الخطأ ويسمح بإعادة المحاولة', async () => {
  sendOtpCode.mockResolvedValue({ email: 'a@b.co' });
  verifyOtpCode.mockRejectedValue(new Error('رمز غير صحيح أو منتهي: invalid'));
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'a@b.co' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));

  fireEvent.change(await screen.findByLabelText('رمز التحقق'), {
    target: { value: '000000' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'تأكيد الدخول' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/رمز غير صحيح/);
  expect(screen.getByRole('button', { name: 'تأكيد الدخول' })).toBeEnabled();
});

test('زر تغيير البريد يرجع لخطوة الإيميل', async () => {
  sendOtpCode.mockResolvedValue({ email: 'a@b.co' });
  renderLogin();

  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
    target: { value: 'a@b.co' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل رمز التحقق' }));
  await screen.findByLabelText('رمز التحقق');

  fireEvent.click(screen.getByRole('button', { name: 'تغيير البريد' }));
  expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
});
