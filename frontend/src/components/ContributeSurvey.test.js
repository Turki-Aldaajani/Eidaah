// اختبارات استبيان المساهمة (مهمة I2)
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContributeSurvey from './ContributeSurvey';

jest.mock('../lib/governance', () => ({ submitMaterialRequest: jest.fn() }));
const { submitMaterialRequest } = require('../lib/governance');

const course = { name: 'شبكات الحاسب', default_level: 4 };
const profile = { university: 'جامعة الإمام', college: 'كلية الحاسب', major: 'علوم حاسب', level: 4 };

beforeEach(() => {
  submitMaterialRequest.mockResolvedValue({ id: 'req-1' });
});

test('«تخطّي» يُبقي المقرر خاصاً ولا يرسل طلباً', () => {
  const onClose = jest.fn();
  render(<ContributeSurvey course={course} profile={profile} onClose={onClose} />);
  expect(screen.getByText('ساهم في المكتبة؟')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /تخطّي/ }));
  expect(onClose).toHaveBeenCalled();
  expect(submitMaterialRequest).not.toHaveBeenCalled();
});

test('«نعم» ثم إرسال يقدّم طلب مساهمة (محتوى مكتمل) ويعرض نجاحاً', async () => {
  render(<ContributeSurvey course={course} profile={profile} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'نعم، ضمن الخطة الجامعية' }));

  expect(screen.getByLabelText('اسم المقرر')).toHaveValue('شبكات الحاسب');
  fireEvent.click(screen.getByRole('button', { name: 'أرسل للمراجعة' }));

  await waitFor(() =>
    expect(submitMaterialRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'شبكات الحاسب',
        university: 'جامعة الإمام',
        level: 4,
        description: expect.stringContaining('المحتوى مكتمل'),
      })
    )
  );
  expect(await screen.findByText('وصلت مساهمتك ✓')).toBeInTheDocument();
});

test('اختيار «يوجد متبقٍ» ينعكس في وصف الطلب', async () => {
  render(<ContributeSurvey course={course} profile={profile} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'نعم، ضمن الخطة الجامعية' }));
  fireEvent.click(screen.getByRole('button', { name: 'يوجد متبقٍ' }));
  fireEvent.click(screen.getByRole('button', { name: 'أرسل للمراجعة' }));

  await waitFor(() =>
    expect(submitMaterialRequest).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('يوجد محتوى متبقٍ') })
    )
  );
});
