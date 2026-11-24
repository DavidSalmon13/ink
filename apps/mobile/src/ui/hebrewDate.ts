/**
 * Home's date overline ("יום ראשון, 15 בנובמבר"), evaluated in Asia/Jerusalem (CLAUDE.md).
 * Hebrew names are spelled out here rather than taken from Intl's `he` locale, which not every JS
 * engine/OS combination ships; Intl is used only to read the calendar day in the right time zone.
 */
const WEEKDAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export const APP_TIME_ZONE = 'Asia/Jerusalem';

/** Year/month/day as seen in Israel at `date`. */
function israelCalendarDay(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function formatHomeDate(date: Date = new Date()): string {
  const { year, month, day } = israelCalendarDay(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${day} ב${MONTHS[month - 1]}`;
}

/** "מרץ 2026": the month and year of an ISO instant as seen in Israel (client-card "לקוח/ה מאז"). */
export function formatMonthYear(iso: string): string {
  const { year, month } = israelCalendarDay(new Date(iso));
  return `${MONTHS[month - 1]} ${year}`;
}

/** "02.10.2026": the calendar day of an ISO instant as seen in Israel (marketing-consent's consent date). */
export function formatDayDate(iso: string): string {
  const { year, month, day } = israelCalendarDay(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(day)}.${pad(month)}.${year}`;
}
