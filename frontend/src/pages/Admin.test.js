// اختبارات صفحة المشرف (مهمة I2)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Admin from './Admin';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/supabaseClient', () => ({ isSupabaseConfigured: jest.fn(() => true) }));
jest.mock('../lib/governance', () => ({
  fetchPendingRequests: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
}));

const { useAuth } = require('../auth/AuthContext');
const { isSupabaseConfigured } = require('../lib/supabaseClient');
const governance = require('../lib/governance');
const { ADMIN_EMAILS } = require('../data/admins');

const ADMIN = ADMIN_EMAILS[0];

function renderAdmin() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Admin />
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  isSupabaseConfigured.mockReturnValue(true);
  governance.fetchPendingRequests.mockResolvedValue([
    { id: 'r1', title: 'قواعد البيانات', description: 'د', university: 'جامعة', level: 3 },
  ]);
  governance.approveRequest.mockResolvedValue('mat-1');
  governance.rejectRequest.mockResolvedValue();
});

test('غير المشرف يُمنع من الصفحة', async () => {
  useAuth.mockReturnValue({ session: { user: { id: 'u2', email: 'student@gmail.com' } }, account: null });
  renderAdmin();
  expect(await screen.findByText('هذه الصفحة للمشرفين فقط.')).toBeInTheDocument();
  expect(governance.fetchPendingRequests).not.toHaveBeenCalled();
});

test('المشرف يرى الطلبات المعلّقة', async () => {
  useAuth.mockReturnValue({ session: { user: { id: 'a1', email: ADMIN } }, account: null });
  renderAdmin();
  expect(await screen.findByText('قواعد البيانات')).toBeInTheDocument();
  expect(governance.fetchPendingRequests).toHaveBeenCalled();
});

test('القبول يستدعي approveRequest ويعيد التحميل', async () => {
  useAuth.mockReturnValue({ session: { user: { id: 'a1', email: ADMIN } }, account: null });
  renderAdmin();
  await screen.findByText('قواعد البيانات');
  fireEvent.click(screen.getByRole('button', { name: /قبول/ }));
  await waitFor(() => expect(governance.approveRequest).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'r1' })
  ));
  expect(await screen.findByText(/تمت الموافقة/)).toBeInTheDocument();
});

test('الرفض يستدعي rejectRequest', async () => {
  useAuth.mockReturnValue({ session: { user: { id: 'a1', email: ADMIN } }, account: null });
  renderAdmin();
  await screen.findByText('قواعد البيانات');
  fireEvent.click(screen.getByRole('button', { name: /رفض/ }));
  await waitFor(() => expect(governance.rejectRequest).toHaveBeenCalledWith('r1'));
});

test('بدون جلسة لا تعرض الصفحة', () => {
  useAuth.mockReturnValue({ session: null, account: null });
  renderAdmin();
  expect(screen.queryByText('طلبات رفع المواد')).not.toBeInTheDocument();
});
