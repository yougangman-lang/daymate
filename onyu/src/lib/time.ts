// Asia/Seoul 기준 날짜·시간 유틸. 한국은 서머타임이 없어 +09:00 고정 오프셋을 사용한다.
import type { ISODate } from '../domain/types';

export const TZ = 'Asia/Seoul';
const OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 서울 기준 날짜 'YYYY-MM-DD' */
export function seoulDate(d: Date): ISODate {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** 서울 기준 'HH:MM' */
export function seoulTime(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** 서울 날짜 + 'HH:MM' → Date */
export function seoulDateTime(date: ISODate, time = '00:00'): Date {
  return new Date(`${date}T${time}:00+09:00`);
}

export function addDays(date: ISODate, n: number): ISODate {
  const t = Date.parse(`${date}T00:00:00Z`) + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

export function addMonths(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** 두 날짜 사이 일수 (b - a) */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** 0=일 … 6=토 */
export function weekday(date: ISODate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isWeekday(date: ISODate): boolean {
  const w = weekday(date);
  return w >= 1 && w <= 5;
}

/** from 기준 n번째 평일 (from 자체는 제외). n>0 이후, n<0 이전 */
export function shiftWeekdays(from: ISODate, n: number): ISODate {
  if (n === 0) return from;
  const step = n > 0 ? 1 : -1;
  let d = from;
  let count = 0;
  while (count < Math.abs(n)) {
    d = addDays(d, step);
    if (isWeekday(d)) count += 1;
  }
  return d;
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayLabel(date: ISODate): string {
  return WD[weekday(date)];
}

/** '11월 26일 (목)' */
export function formatDate(date: ISODate, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${withYear ? `${y}년 ` : ''}${m}월 ${d}일 (${weekdayLabel(date)})`;
}

export function formatDateShort(date: ISODate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}.${d}`;
}

/** ISO datetime → '11월 26일 (목) 14:15' (서울 기준) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(seoulDate(d))} ${seoulTime(d)}`;
}

export function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}
