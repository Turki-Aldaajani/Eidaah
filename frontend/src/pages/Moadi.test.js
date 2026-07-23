// اختبارات صفحة مقرراتي (مهمة S2): الاختيار، مستوى الطالب، كشف غير المتوفرة، دورة الفصل
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

// الطالب في المستوى 2؛ c2 متاح، c3 مقفل بمتطلب c2 (كلاهما مستوى 2)
const SELECTED = [
  { id: 'sc1', status: 'in_progress', course: { id: 'c1', name: 'مقدمة في البرمجة', elective_type: 'required', default_level: 1 } },
];
const CATALOG = [
  { id: 'c1', name: 'مقدمة في البرمجة', elective_type: 'required', default_level: 1, prerequisites: [] },
  { id: 'c2', name: 'هياكل البيانات', elective_type: 'required', default_level: 2, prerequisites: [] },
  { id: 'c3', name: 'الخوارزميات', elective_type: 'free_elective', default_level: 2, prerequisites: ['c2'] },
];

let saveProfile;
beforeEach(() => {
  isSupabaseConfigured.mockReturnValue(true);
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } }, account: null });
  saveProfile = jest.fn().mockResolvedValue({});
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الإمام', level: 2, current_term: '1447-1' },
    saveProfile,
  });
  courses.fetchCourseCatalog.mockResolvedValue(CATALOG);
  courses.fetchStudentCourses.mockResolvedValue(SELECTED);
  courses.selectCourse.mockResolvedValue({ id: 'scX', status: 'in_progress' });
  courses.unselectCourse.mockResolvedValue();
  courses.addCustomCourse.mockResolvedValue({ id: 'cNew', name: 'مقرر خاص', prerequisites: [] });
  courses.updateStudentCourseStatus.mockResolvedValue({ id: 'sc1', status: 'completed' });
});

test('الافتراضي يعرض مقررات مستوى الطالب المتاحة، ويُخفي المقفلة', async () => {
  renderMoadi();
  // c2 (مستوى 2، متاح) يظهر
  expect(await screen.findByText('هياكل البيانات')).toBeInTheDocument();
  // c3 (مستوى 2، مقفل) مخفي افتراضياً — لا يظهر رماديّاً
  expect(screen.queryByText('الخوارزميات')).not.toBeInTheDocument();
});

test('إضافة مقرر متاح يستدعي selectCourse بالفصل الحالي', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  fireEvent.click(screen.getByRole('button', { name: /أضف لمقرراتي/ }));
  await waitFor(() => expect(courses.selectCourse).toHaveBeenCalledWith('c2', '1447-1'));
});

test('«إظهار غير المتوفرة» يكشف المقفلة، وإضافتها تتطلب تأكيد المتطلب', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');

  // كشف المقفلة
  fireEvent.click(screen.getByLabelText('إظهار المقررات غير المتوفرة لمستواك'));
  expect(await screen.findByText('الخوارزميات')).toBeInTheDocument();
  expect(screen.getByText(/يتطلب: هياكل البيانات/)).toBeInTheDocument();

  // إضافة المقفل تفتح تأكيد المتطلب (لا تُضاف مباشرة)
  const lockedCard = screen.getByText('الخوارزميات').closest('.subject-card');
  fireEvent.click(lockedCard.querySelector('button'));
  expect(await screen.findByText('تأكيد المتطلب')).toBeInTheDocument();
  expect(courses.selectCourse).not.toHaveBeenCalled();

  // التأكيد يُضيف المقرر
  fireEvent.click(screen.getByRole('button', { name: /نعم، اجتزت المتطلب/ }));
  await waitFor(() => expect(courses.selectCourse).toHaveBeenCalledWith('c3', '1447-1'));
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
  fireEvent.click(await screen.findByRole('button', { name: /تأكيد وبدء فصل جديد/ }));

  await waitFor(() => expect(courses.updateStudentCourseStatus).toHaveBeenCalledWith('sc1', 'completed'));
  expect(saveProfile).toHaveBeenCalledWith(
    expect.objectContaining({ level: 3, current_term: expect.stringContaining('التالي') })
  );
  expect(await screen.findByText(/إجازة سعيدة/)).toBeInTheDocument();
});

test('بدون جلسة لا تعرض الصفحة (توجيه للدخول)', async () => {
  useAuth.mockReturnValue({ session: null, account: null });
  renderMoadi();
  expect(screen.queryByText(/مقرراتي هذا الفصل/)).not.toBeInTheDocument();
});
