// اختبارات صفحة موادي (مهمة S2): الاختيار، قفل المتطلبات، الإضافة، دورة الفصل
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Moadi from './Moadi';
import { ThemeProvider } from '../theme/ThemeContext';

jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../profile/ProfileContext', () => ({ useProfile: jest.fn() }));
jest.mock('../lib/supabaseClient', () => ({ isSupabaseConfigured: jest.fn(() => true) }));
jest.mock('../lib/courses', () => ({
  ...jest.requireActual('../lib/courses'),
  fetchCourseCatalog: jest.fn(),
  fetchStudentCourses: jest.fn(),
  selectCourse: jest.fn(),
  unselectCourse: jest.fn(),
  addCustomCourse: jest.fn(),
  updateStudentCourseStatus: jest.fn(),
}));

const { useAuth } = require('../auth/AuthContext');
const { useProfile } = require('../profile/ProfileContext');
const { isSupabaseConfigured } = require('../lib/supabaseClient');
const courses = require('../lib/courses');

function renderMoadi() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Moadi />
      </ThemeProvider>
    </MemoryRouter>
  );
}

const SELECTED = [
  { id: 'sc1', status: 'in_progress', course: { id: 'c1', name: 'مقدمة في البرمجة', elective_type: 'required', default_level: 1 } },
];
const CATALOG = [
  { id: 'c1', name: 'مقدمة في البرمجة', elective_type: 'required', default_level: 1, prerequisites: [] },
  { id: 'c2', name: 'هياكل البيانات', elective_type: 'required', default_level: 2, prerequisites: [] },
  { id: 'c3', name: 'الخوارزميات', elective_type: 'free_elective', default_level: 3, prerequisites: ['c2'] },
];

let saveProfile;
beforeEach(() => {
  isSupabaseConfigured.mockReturnValue(true);
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } }, account: null });
  saveProfile = jest.fn().mockResolvedValue({});
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الإمام', level: 3, current_term: '1447-1' },
    saveProfile,
  });
  courses.fetchCourseCatalog.mockResolvedValue(CATALOG);
  courses.fetchStudentCourses.mockResolvedValue(SELECTED);
  courses.selectCourse.mockResolvedValue({ id: 'scX', status: 'in_progress' });
  courses.unselectCourse.mockResolvedValue();
  courses.addCustomCourse.mockResolvedValue({ id: 'cNew', name: 'مقرر خاص', prerequisites: [] });
  courses.updateStudentCourseStatus.mockResolvedValue({ id: 'sc1', status: 'completed' });
});

test('تعرض المقررات المختارة والكتالوج المتاح', async () => {
  renderMoadi();
  expect(await screen.findByText('مقرراتي هذا الفصل (1)')).toBeInTheDocument();
  // المختار يظهر، والمتاح من الكتالوج (المستبعد منه المختار) يظهر
  expect(screen.getAllByText('مقدمة في البرمجة').length).toBeGreaterThan(0);
  expect(screen.getByText('هياكل البيانات')).toBeInTheDocument();
});

test('إضافة مقرر من الكتالوج يستدعي selectCourse بالفصل الحالي', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  const addButtons = screen.getAllByRole('button', { name: /أضف لمقرراتي/ });
  fireEvent.click(addButtons[0]);
  await waitFor(() => expect(courses.selectCourse).toHaveBeenCalledWith('c2', '1447-1'));
});

test('مقرر بمتطلب غير مكتمل يظهر مقفلاً مع «يتطلب»', async () => {
  renderMoadi();
  expect(await screen.findByText(/يتطلب: هياكل البيانات/)).toBeInTheDocument();
  // زر إضافة الخوارزميات (المقفل) معطّل
  const algoCard = screen.getByText('الخوارزميات').closest('.subject-card');
  const addBtn = algoCard.querySelector('button');
  expect(addBtn).toBeDisabled();
});

test('إضافة مقرر خاص تستدعي addCustomCourse ثم selectCourse', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أضف مقرراً خاصاً/ }));
  fireEvent.change(screen.getByLabelText('اسم المقرر'), { target: { value: 'تعلم آلي' } });
  fireEvent.click(screen.getByRole('button', { name: 'أضف واختر' }));
  await waitFor(() =>
    expect(courses.addCustomCourse).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'تعلم آلي', university: 'جامعة الإمام' })
    )
  );
  expect(courses.selectCourse).toHaveBeenCalledWith('cNew', '1447-1');
});

test('إنهاء الفصل يرقّي المستوى ويظهر تهنئة', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أنهيت الفصل/ }));
  // نافذة إنهاء الفصل ظهرت
  fireEvent.click(await screen.findByRole('button', { name: /تأكيد وبدء فصل جديد/ }));

  await waitFor(() => expect(courses.updateStudentCourseStatus).toHaveBeenCalledWith('sc1', 'completed'));
  // المستوى يرتفع من 3 إلى 4 ويُحفظ فصل جديد
  expect(saveProfile).toHaveBeenCalledWith(
    expect.objectContaining({ level: 4, current_term: expect.stringContaining('التالي') })
  );
  expect(await screen.findByText(/إجازة سعيدة/)).toBeInTheDocument();
});

test('بدون جلسة لا تعرض الصفحة (توجيه للدخول)', async () => {
  useAuth.mockReturnValue({ session: null, account: null });
  renderMoadi();
  expect(screen.queryByText(/مقرراتي هذا الفصل/)).not.toBeInTheDocument();
});
