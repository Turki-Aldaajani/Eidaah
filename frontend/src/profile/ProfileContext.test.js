// اختبارات سياق الملف الشخصي (مهمة F1)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileProvider, useProfile } from './ProfileContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/supabaseClient', () => ({ isSupabaseConfigured: jest.fn(() => true) }));
jest.mock('../lib/profile', () => ({
  fetchProfile: jest.fn(),
  saveProfile: jest.fn(),
  isProfileComplete: jest.requireActual('../lib/profile').isProfileComplete,
  hasSkippedOnboarding: jest.fn(() => false),
  markOnboardingSkipped: jest.fn(),
}));

const { useAuth } = require('../auth/AuthContext');
const { isSupabaseConfigured } = require('../lib/supabaseClient');
const profileLib = require('../lib/profile');

function Consumer() {
  const { profile, needsOnboarding, loading, saveProfile, skipOnboarding } = useProfile();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="needs">{String(needsOnboarding)}</span>
      <span data-testid="university">{profile?.university || 'none'}</span>
      <button onClick={() => saveProfile({ university: 'جامعة الإمام', level: 3 })}>save</button>
      <button onClick={() => skipOnboarding()}>skip</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ProfileProvider>
      <Consumer />
    </ProfileProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  isSupabaseConfigured.mockReturnValue(true);
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } } });
  profileLib.hasSkippedOnboarding.mockReturnValue(false);
  profileLib.fetchProfile.mockResolvedValue(null);
  profileLib.saveProfile.mockResolvedValue({ university: 'جامعة الإمام', level: 3 });
});

test('needsOnboarding يصير true عندما يكون الملف ناقصاً بعد التحميل', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  expect(screen.getByTestId('needs')).toHaveTextContent('true');
});

test('needsOnboarding يبقى false عندما يكون الملف مكتملاً', async () => {
  profileLib.fetchProfile.mockResolvedValue({ university: 'جامعة الإمام', level: 4 });
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  expect(screen.getByTestId('needs')).toHaveTextContent('false');
  expect(screen.getByTestId('university')).toHaveTextContent('جامعة الإمام');
});

test('لا حاجة للأونبوردنق بدون جلسة', async () => {
  useAuth.mockReturnValue({ session: null });
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('needs')).toHaveTextContent('false'));
  expect(profileLib.fetchProfile).not.toHaveBeenCalled();
});

test('saveProfile يحدّث السياق فوراً ويلغي حاجة الأونبوردنق', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('needs')).toHaveTextContent('true'));

  fireEvent.click(screen.getByText('save'));

  await waitFor(() => expect(screen.getByTestId('university')).toHaveTextContent('جامعة الإمام'));
  expect(screen.getByTestId('needs')).toHaveTextContent('false');
});

test('skipOnboarding يلغي حاجة الأونبوردنق', async () => {
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('needs')).toHaveTextContent('true'));

  fireEvent.click(screen.getByText('skip'));

  await waitFor(() => expect(screen.getByTestId('needs')).toHaveTextContent('false'));
  expect(profileLib.markOnboardingSkipped).toHaveBeenCalledWith('u1');
});
