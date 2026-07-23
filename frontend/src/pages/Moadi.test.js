// اختبارات صفحة مقرراتي (S2): توفّر لا مستوى، ثلاث خيارات للمتطلب، سجل المُجتاز
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
  fetchCompletedCourseIds: jest.fn(),
  markCoursesCompleted: jest.fn(),
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
  { id: 'c3', name: 'الخوارزميات', elective_type: 'free_elective', default_level: 2, prerequisites: ['c2'] }, // مقفل
  { id: 'c5', name: 'أنظمة التشغيل', elective_type: 'required', default_level: 3, prerequisites: [] }, // مستوى آخر (إجباري)
  { id: 'c6', name: 'ريادة الأعمال', elective_type: 'pure_elective', default_level: 5, prerequisites: [] }, // اختياري بلا قيد مستوى
];

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
  courses.fetchCompletedCourseIds.mockResolvedValue([]);
  courses.markCoursesCompleted.mockResolvedValue([]);
  courses.selectCourses.mockResolvedValue([]);
  courses.unselectCourse.mockResolvedValue();
  courses.addCustomCourse.mockResolvedValue({ id: 'cNew', name: 'مقرر خاص', elective_type: 'required', prerequisites: [] });
  courses.updateStudentCourseStatus.mockResolvedValue({ id: 'sc1', status: 'completed' });
});

function addButtonFor(name) {
  return screen.getByText(name).closest('.subject-card').querySelector('button');
}

test('الافتراضي: المتاح لمستوى الطالب + الاختيارية بلا قيد مستوى؛ المقفل والإجباري بمستوى آخر مخفيان', async () => {
  renderMoadi();
  expect(await screen.findByText('هياكل البيانات')).toBeInTheDocument(); // إجباري مستوى 2 متاح
  expect(screen.getByText('قواعد البيانات')).toBeInTheDocument();
  expect(screen.getByText('ريادة الأعمال')).toBeInTheDocument(); // اختياري مستوى 5 → يظهر (لا قيد مستوى)
  expect(screen.queryByText('الخوارزميات')).not.toBeInTheDocument(); // مقفل → مخفي
  expect(screen.queryByText('أنظمة التشغيل')).not.toBeInTheDocument(); // إجباري مستوى آخر → مخفي
});

test('«إظهار غير المتوفرة» يكشف المقفلة (لا يرتبط بالمستوى)', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  fireEvent.click(screen.getByLabelText('إظهار المقررات غير المتوفرة (المقفلة بمتطلبات)'));
  expect(await screen.findByText('الخوارزميات')).toBeInTheDocument(); // مقفل مستوى 2 يظهر
});

test('المقرر المُجتاز سابقاً لا يظهر في الكتالوج', async () => {
  courses.fetchCompletedCourseIds.mockResolvedValue(['c4']);
  renderMoadi();
  expect(await screen.findByText('هياكل البيانات')).toBeInTheDocument();
  expect(screen.queryByText('قواعد البيانات')).not.toBeInTheDocument(); // مُجتاز → مستبعد
});

test('«أنهيت المتطلب» يسجّل المتطلب مُجتازاً ثم يحدّد المقرر', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  fireEvent.click(screen.getByLabelText('إظهار المقررات غير المتوفرة (المقفلة بمتطلبات)'));

  fireEvent.click(addButtonFor('الخوارزميات'));
  expect(await screen.findByText('متطلب هذا المقرر')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'نعم، أنهيت المتطلب' }));

  await waitFor(() => expect(courses.markCoursesCompleted).toHaveBeenCalledWith(['c2']));
  fireEvent.click(await screen.findByRole('button', { name: /إلى مقرراتي/ }));
  await waitFor(() =>
    expect(courses.selectCourses).toHaveBeenCalledWith(expect.arrayContaining(['c3']), OPEN_TERM)
  );
});

test('«الإرشاد سمح لي» يضيف المقرر بلا تسجيل المتطلب', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  fireEvent.click(screen.getByLabelText('إظهار المقررات غير المتوفرة (المقفلة بمتطلبات)'));

  fireEvent.click(addButtonFor('الخوارزميات'));
  fireEvent.click(await screen.findByRole('button', { name: /الإرشاد سمح لي/ }));

  expect(courses.markCoursesCompleted).not.toHaveBeenCalled();
  expect(await screen.findByRole('button', { name: /إلى مقرراتي/ })).toBeInTheDocument();
});

test('الإضافة مجمّعة: تحديد محلي ثم دفعة واحدة عبر selectCourses', async () => {
  renderMoadi();
  await screen.findByText('هياكل البيانات');
  fireEvent.click(addButtonFor('هياكل البيانات'));
  expect(courses.selectCourses).not.toHaveBeenCalled();
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
  expect(courses.fetchCourseCatalog).toHaveBeenCalledTimes(1);
});

test('إضافة مقرر خاص: بلا جامعة (خاص)، وتُظهر استبيان المساهمة', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أضف مقرراً خاصاً/ }));
  fireEvent.change(screen.getByLabelText('اسم المقرر'), { target: { value: 'تعلم آلي' } });
  fireEvent.click(screen.getByRole('button', { name: /أضِف وحدّد/ }));

  await waitFor(() =>
    expect(courses.addCustomCourse).toHaveBeenCalledWith(expect.objectContaining({ name: 'تعلم آلي' }))
  );
  // المقرر الخاص لا يحمل جامعة (لا يتسرّب لكتالوج غيره)
  expect(courses.addCustomCourse.mock.calls[0][0]).not.toHaveProperty('university');
  // يظهر استبيان المساهمة، والمقرر محدَّد للإضافة المجمّعة
  expect(await screen.findByText('ساهم في المكتبة؟')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /إلى مقرراتي/ })).toBeInTheDocument();
});

test('إنهاء الفصل بخيارين: «تجاوزت» ترقّي المستوى وتظهر تهنئة', async () => {
  renderMoadi();
  fireEvent.click(await screen.findByRole('button', { name: /أنهيت الفصل/ }));
  const dialog = await screen.findByRole('dialog', { name: 'إنهاء الفصل' });
  expect(within(dialog).getByRole('button', { name: 'تجاوزت' })).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'لم أتجاوز' })).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: /تأكيد وبدء فصل جديد/ }));

  await waitFor(() => expect(courses.updateStudentCourseStatus).toHaveBeenCalledWith('sc1', 'completed'));
  expect(saveProfile).toHaveBeenCalledWith(expect.objectContaining({ level: 3 }));
  expect(await screen.findByText(/إجازة سعيدة/)).toBeInTheDocument();
});

test('يُفعّل إنهاء الفصل تلقائياً عند نهاية الفصل الدراسي', async () => {
  setProfile({ current_term: '1447-1' });
  renderMoadi();
  expect(await screen.findByRole('dialog', { name: 'إنهاء الفصل' })).toBeInTheDocument();
});

test('بدون جلسة لا تعرض الصفحة (توجيه للدخول)', async () => {
  useAuth.mockReturnValue({ session: null, account: null });
  renderMoadi();
  expect(screen.queryByText(/مقرراتي هذا الفصل/)).not.toBeInTheDocument();
});
