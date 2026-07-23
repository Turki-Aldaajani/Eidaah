// اختبارات ويدجت النقاط (مهمة F6)
import { render, screen } from '@testing-library/react';
import PointsWidget from './PointsWidget';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../points/PointsContext', () => ({ usePoints: jest.fn() }));

const { useAuth } = require('../auth/AuthContext');
const { usePoints } = require('../points/PointsContext');

beforeEach(() => {
  jest.clearAllMocks();
});

test('لا يظهر بدون جلسة (النقاط مرتبطة بالحساب)', () => {
  useAuth.mockReturnValue({ session: null });
  usePoints.mockReturnValue({ balance: 40, level: { level: 1, name: 'مُبتدئ' } });
  render(<PointsWidget />);
  expect(screen.queryByTestId('points-widget')).not.toBeInTheDocument();
});

test('يعرض الرصيد والمستوى للمستخدم المسجَّل بأرقام عربية', () => {
  useAuth.mockReturnValue({ session: { user: { id: 'u1' } } });
  usePoints.mockReturnValue({ balance: 45, level: { level: 2, name: 'مُثابِر' } });
  render(<PointsWidget />);
  expect(screen.getByTestId('points-widget')).toBeInTheDocument();
  expect(screen.getByTestId('points-balance')).toHaveTextContent('٤٥');
  expect(screen.getByText('مُثابِر')).toBeInTheDocument();
});

test('العنوان يوضّح رقم المستوى واسمه', () => {
  useAuth.mockReturnValue({ session: { user: { id: 'u1' } } });
  usePoints.mockReturnValue({ balance: 0, level: { level: 1, name: 'مُبتدئ' } });
  render(<PointsWidget />);
  expect(screen.getByTestId('points-widget')).toHaveAttribute('title', 'المستوى ١: مُبتدئ');
});
