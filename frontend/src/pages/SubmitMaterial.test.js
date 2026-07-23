// اختبارات صفحة «أضف مقرراً» (مهمة I2)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubmitMaterial from './SubmitMaterial';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../profile/ProfileContext', () => ({ useProfile: jest.fn() }));
jest.mock('../lib/governance', () => ({ submitMaterialRequest: jest.fn() }));

const { useAuth } = require('../auth/AuthContext');
const { useProfile } = require('../profile/ProfileContext');
const { submitMaterialRequest } = require('../lib/governance');

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SubmitMaterial />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } }, account: null });
  useProfile.mockReturnValue({ profile: { university: 'جامعة الإمام', college: 'كلية الحاسب', level: 3 } });
  submitMaterialRequest.mockResolvedValue({ id: 'req-1' });
});

test('تُعبّئ الجامعة من الملف وترسل الطلب ثم تعرض نجاحاً', async () => {
  renderPage();
  expect(screen.getByLabelText('الجامعة')).toHaveValue('جامعة الإمام');

  fireEvent.change(screen.getByLabelText('اسم المقرر'), { target: { value: 'قواعد البيانات' } });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل الطلب' }));

  await waitFor(() =>
    expect(submitMaterialRequest).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'قواعد البيانات', university: 'جامعة الإمام', level: 3 })
    )
  );
  expect(await screen.findByText('وصل طلبك ✓')).toBeInTheDocument();
});

test('خطأ الإرسال يظهر للمستخدم', async () => {
  submitMaterialRequest.mockRejectedValue(new Error('تعذّر تسجيل طلب المادة: down'));
  renderPage();
  fireEvent.change(screen.getByLabelText('اسم المقرر'), { target: { value: 'مادة' } });
  fireEvent.click(screen.getByRole('button', { name: 'أرسل الطلب' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/تعذّر تسجيل طلب المادة/);
});

test('بدون جلسة لا تعرض النموذج', () => {
  useAuth.mockReturnValue({ session: null, account: null });
  renderPage();
  expect(screen.queryByLabelText('اسم المقرر')).not.toBeInTheDocument();
});
