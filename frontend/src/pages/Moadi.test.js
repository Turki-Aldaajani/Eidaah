// اختبارات صفحة مقرراتي (مهمة S2): تحديد مجمّع، بحث، خياران لإنهاء الفصل، تفعيل تلقائي
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  selectCourses: jest.fn(),
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
  { id: 'c4', name: 'قواعد البيانات', elective_type: 'required', default_level: 2, prerequisites: [] },
  { id: 'c3', name: 'الخوارزميات', elective_type: 'free_elective', default_level: 2, prerequisites: ['c2'] },
];

// فصل غير مُعرّف في التقويم → لا تفعيل تلقائي لإنهاء الفصل في معظم الاختبارات
const OPEN_TERM = '1450-1';

let saveProfile;
function setProfile(overrides = {}) {
  useProfile.mockReturnValue({
    profile: { university: 'جامعة الإمام', level: 2, current_term: OPEN_TERM, ...overrides },
    saveProfile,
  });
}

beforeEach(() => {
  isSupabaseConfigured.mockReturnValue(true);
  useAuth.mockReturnValue({ session: { user: { id: 'u1', email: 'a@imamu.edu.sa' } }, account: null });
  saveProfile = jest.fn().mockResolvedValue({});
  setProfile();
  courses.fetchCourseCatalog.mockResolvedValue(CATALOG);
  courses.fetchStudentCourses.mockResolvedValue(SELECTED);
  courses.selectCourses.mockResolvedValue([]);
  courses.unselectCourse.mockResolvedValue();
  courses.addCustomCourse.mockResolvedValue({ id: 'cNew', name: 'مقرر خاص', elective_type: 'required', prerequisites: [] });
  courses.updateStudentCourseStatus.mockResolvedValue({ id: 'sc1', status: 'completed' });
});

function addButtonFor(name) {
  return screen.getByText(name).closest('.subject-card').querySelector('button');
}

test('الافتراضي يعرض مقررات مستوى الطالب المتاحة، ويُخفي المقفلة', async () => {
  renderMoadi();
  expect(await screen.findByText('هياكل البيانات')).toBeInTheDocument();
  expect(screen.getByText('قواعد البيانات')).toBeInTheDocument();
  expect(screen.queryByText('الخوارزميات')).not.toBeInTheDocument(); // مقفل → مخفي
});

test('الإضافة مجمّعة: التحديد محلي بلا اتصال، ثم دفعة واحدة عبر selectCourses', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');

  fireEvent.click(addButtonFor('هياكل البيانات')); // تحديد محلي
  expect(courses.selectCourses).not.toHaveBeenCalled(); // لا اتصال بالسيرفر بعد

  fireEvent.click(await screen.findByRole('button', { name: /إلى مقرراتي/ }));
  await waitFor(() => expect(courses.selectCourses).toHaveBeenCalledWith(['c2'], OPEN_TERM));
});

test('البحث يفلتر الكتالوج فوراً بلا إعادة تحميل', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  expect(screen.getByText('قواعد البيانات')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('بحث المقررات'), { target: { value: 'هياكل' } });
  expect(screen.getByText('هياكل البيانات')).toBeInTheDocument();
  expect(screen.queryByText('قواعد البيانات')).not.toBeInTheDocument();
  expect(courses.fetchCourseCatalog).toHaveBeenCalledTimes(1); // لا إعادة تحميل
});

test('مقرر مقفل: يظهر بالكشف، وتحديده يتطلب تأكيد المتطلب', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  fireEvent.click(screen.getByLabelText('إظهار المقررات غير المتوفرة لمستواك'));

  expect(await screen.findByText('الخوارزميات')).toBeInTheDocument();
  fireEvent.click(addButtonFor('الخوارزميات'));
  expect(await screen.findByText('تأكيد المتطلب')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /نعم، اجتزت المتطلب/ }));
  expect(courses.selectCourses).not.toHaveBeenCalled(); // حُدِّد فقط
  fireEvent.click(await screen.findByRole('button', { name: /إلى مقرراتي/ }));
  await waitFor(() =>
    expect(courses.selectCourses).toHaveBeenCalledWith(expect.arrayContaining(['c3']), OPEN_TERM)
  );
});

test('إضافة مقرر خاص تُنشئه وتُحدّده للإضافة المجمّعة', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أضف مقرراً خاصاً/ }));
  fireEvent.change(screen.getByLabelText('اسم المقرر'), { target: { value: 'تعلم آلي' } });
  fireEvent.click(screen.getByRole('button', { name: /أضِف وحدّد/ }));

  await waitFor(() =>
    expect(courses.addCustomCourse).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'تعلم آلي', university: 'جامعة الإمام' })
    )
  );
  expect(await screen.findByRole('button', { name: /إلى مقرراتي/ })).toBeInTheDocument();
});

test('إنهاء الفصل بخيارين فقط: «لم أتجاوز» يسجّل الحالة ويبدأ فصلاً جديداً', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أنهيت الفصل/ }));
  const dialog = await screen.findByRole('dialog', { name: 'إنهاء الفصل' });

  expect(within(dialog).getByRole('button', { name: 'تجاوزت' })).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'لم أتجاوز' })).toBeInTheDocument();
  expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument(); // بلا قائمة منسدلة

  fireEvent.click(within(dialog).getByRole('button', { name: 'لم أتجاوز' }));
  fireEvent.click(within(dialog).getByRole('button', { name: /تأكيد وبدء فصل جديد/ }));

  await waitFor(() => expect(courses.updateStudentCourseStatus).toHaveBeenCalledWith('sc1', 'dropped'));
  expect(saveProfile).toHaveBeenCalledWith(
    expect.objectContaining({ current_term: expect.stringContaining('التالي') })
  );
});

test('«تجاوزت» ترقّي المستوى وتظهر تهنئة', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أنهيت الفصل/ }));
  const dialog = await screen.findByRole('dialog', { name: 'إنهاء الفصل' });
  fireEvent.click(within(dialog).getByRole('button', { name: /تأكيد وبدء فصل جديد/ }));

  await waitFor(() => expect(courses.updateStudentCourseStatus).toHaveBeenCalledWith('sc1', 'completed'));
  expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({ level: 3 }));
  expect(await screen.findByText(/إجازة سعيدة/)).toBeInTheDocument();
});

test('يُفعّل إنهاء الفصل تلقائياً عند نهاية الفصل الدراسي', async () => {
  setProfile({ current_term: '1447-1' }); // فصل منتهٍ حسب التقويم
  renderMoadi();
  expect(await screen.findByRole('dialog', { name: 'إنهاء الفصل' })).toBeInTheDocument();
});

test('بدون جلسة لا تعرض الصفحة (توجيه للدخول)', async () => {
  useAuth.mockReturnValue({ session: null, account: null });
  renderMoadi();
  expect(screen.queryByText(/مقرراتي هذا الفصل/)).not.toBeInTheDocument();
});
