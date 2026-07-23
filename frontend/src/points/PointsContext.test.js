// اختبارات سياق النقاط (مهمة F6) — يثبت معيار القبول:
// كسب النقاط عند إكمال جولة أسئلة يزيد الرصيد فوراً.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PointsProvider, usePoints } from './PointsContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/supabaseClient', () => ({ isSupabaseConfigured: jest.fn(() => true) }));
jest.mock('../lib/points', () => {
  const actual = jest.requireActual('../lib/points');
  return {
    ...actual,
    fetchPointsBalance: jest.fn(),
    awardPoints: jest.fn(),
  };
});

const { useAuth } = require('../auth/AuthContext');
const { isSupabaseConfigured } = require('../lib/supabaseClient');
const pointsLib = require('../lib/points');

const QUIZ_POINTS = pointsLib.POINTS_BY_REASON.completed_quiz_round;

function Consumer() {
  const { balance, level, award, loading } = usePoints();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="balance">{balance}</span>
      <span data-testid="level">{level.level}</span>
      <button onClick={() => award('completed_quiz_round')}>quiz</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <PointsProvider>
      <Consumer />
    </PointsProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  isSupabaseConfigured.mockReturnValue(true);
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } } });
  pointsLib.fetchPointsBalance.mockResolvedValue(0);
  pointsLib.awardPoints.mockResolvedValue(QUIZ_POINTS);
});

test('يحمّل الرصيد الابتدائي عند وجود جلسة', async () => {
  pointsLib.fetchPointsBalance.mockResolvedValue(45);
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  expect(screen.getByTestId('balance')).toHaveTextContent('45');
});

test('إكمال جولة أسئلة يزيد الرصيد فوراً (قبل اكتمال التخزين)', async () => {
  pointsLib.fetchPointsBalance.mockResolvedValue(0);
  // تخزين لا يُحسم فوراً — نثبت أن الزيادة تظهر دون انتظاره (تحديث متفائل)
  let resolveAward;
  pointsLib.awardPoints.mockReturnValue(new Promise((r) => { resolveAward = r; }));

  renderProvider();
  await waitFor(() => expect(screen.getByTestId('balance')).toHaveTextContent('0'));

  fireEvent.click(screen.getByText('quiz'));

  // الرصيد ارتفع فوراً بمقدار نقاط جولة الأسئلة
  await waitFor(() => expect(screen.getByTestId('balance')).toHaveTextContent(String(QUIZ_POINTS)));
  expect(pointsLib.awardPoints).toHaveBeenCalledWith('completed_quiz_round', {});

  resolveAward(QUIZ_POINTS); // لا يتغير الرصيد بعد الحسم لأن المُسجَّل = المتوقّع
  await waitFor(() => expect(screen.getByTestId('balance')).toHaveTextContent(String(QUIZ_POINTS)));
});

test('يتراجع الرصيد إذا فشل تخزين النقاط', async () => {
  pointsLib.fetchPointsBalance.mockResolvedValue(20);
  pointsLib.awardPoints.mockRejectedValue(new Error('denied'));

  renderProvider();
  await waitFor(() => expect(screen.getByTestId('balance')).toHaveTextContent('20'));

  fireEvent.click(screen.getByText('quiz'));

  // يرجع للرصيد الأصلي بعد فشل التخزين
  await waitFor(() => expect(screen.getByTestId('balance')).toHaveTextContent('20'));
});

test('المستوى يرتفع مع الرصيد', async () => {
  pointsLib.fetchPointsBalance.mockResolvedValue(pointsLib.LEVELS[1].min);
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('level')).toHaveTextContent('2'));
});

test('بدون جلسة: رصيد صفر ولا كسب نقاط', async () => {
  useAuth.mockReturnValue({ session: null });
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  expect(screen.getByTestId('balance')).toHaveTextContent('0');

  fireEvent.click(screen.getByText('quiz'));
  await waitFor(() => expect(pointsLib.awardPoints).not.toHaveBeenCalled());
  expect(screen.getByTestId('balance')).toHaveTextContent('0');
});
