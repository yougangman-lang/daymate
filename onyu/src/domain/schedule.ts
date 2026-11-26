// 수업 운영 규칙. 수업은 날짜·시간대에서 결정적으로 계산되므로 실행 날짜가 바뀌어도 일정이 계속 생성된다.
import type { ISODate } from './types';
import { diffDays, isWeekday, seoulDateTime } from '../lib/time';

export const SLOTS = ['08:00', '09:15', '10:30', '13:00', '14:15', '15:30', '16:45'] as const;
export type Slot = (typeof SLOTS)[number];
export const CAPACITY = 6;
export const SESSION_MINUTES = 60;
export const BOOKING_WINDOW_DAYS = 7;
export const TRIAL_TOTAL = 2;

export const PHASES = [
  { label: '상태 확인·준비', minutes: 20, desc: '컨디션을 묻고 혈압·관절 상태를 확인한 뒤 몸을 데워요.' },
  { label: '본운동', minutes: 20, desc: '같은 동작을 하되 무게·반복·휴식을 한 분씩 조정해요.' },
  { label: '연계 게임', minutes: 15, desc: '본운동 동작을 협동 게임으로 이어서 해요.' },
  { label: '정리', minutes: 5, desc: '호흡을 고르고 오늘 느낀 점을 나눠요.' },
] as const;

export const GAMES = {
  colorRoute: {
    name: 'Color Route(컬러루트)',
    desc: '바닥의 색 표시를 따라 함께 경로를 완성하는 협동 게임이에요. 방향 바꾸기와 보폭 조절을 자연스럽게 연습해요.',
  },
  targetBall: {
    name: 'Target Ball(타깃볼)',
    desc: '부드러운 공을 목표 구역에 굴리거나 던져 팀 점수를 함께 모아요. 개인 순위는 매기지 않아요.',
  },
} as const;

export interface Program {
  id: string;
  title: string;
  focus: string;
  game: keyof typeof GAMES;
}

export const PROGRAMS: Program[] = [
  { id: 'p1', title: '하체 근력·균형', focus: '의자 앉았다 일어서기, 한 발 서기', game: 'colorRoute' },
  { id: 'p2', title: '상체·바른 자세', focus: '밴드 당기기, 벽 밀기', game: 'targetBall' },
  { id: 'p3', title: '전신 순환·보행', focus: '걷기 변형, 계단 오르기 연습', game: 'colorRoute' },
  { id: 'p4', title: '코어·호흡', focus: '앉아서 몸통 돌리기, 호흡 운동', game: 'targetBall' },
];

export const MANAGER_IDS = ['m1', 'm2', 'm3', 'm4'];
export const COACH_IDS = ['c1', 'c2', 'c3', 'c4'];

export interface Session {
  id: string;
  date: ISODate;
  slot: Slot;
  program: Program;
  managerId: string;
  coachIds: [string, string];
  capacity: number;
}

const EPOCH: ISODate = '2024-01-01';

export function sessionIdOf(date: ISODate, slot: string): string {
  return `s-${date.replaceAll('-', '')}-${slot.replace(':', '')}`;
}

export function getSession(id: string): Session | null {
  const m = /^s-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(id);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const slot = `${m[4]}:${m[5]}`;
  return buildSession(date, slot);
}

export function buildSession(date: ISODate, slot: string): Session | null {
  const idx = SLOTS.indexOf(slot as Slot);
  if (idx < 0 || !isWeekday(date) || Number.isNaN(Date.parse(date))) return null;
  const dayNo = diffDays(EPOCH, date);
  const k = ((dayNo * 3 + idx) % 4 + 4) % 4;
  const c = ((dayNo + idx) % 4 + 4) % 4;
  return {
    id: sessionIdOf(date, slot),
    date,
    slot: slot as Slot,
    program: PROGRAMS[k],
    managerId: MANAGER_IDS[((dayNo + idx * 2) % 4 + 4) % 4],
    coachIds: [COACH_IDS[c], COACH_IDS[(c + 1) % 4]],
    capacity: CAPACITY,
  };
}

export function sessionsOn(date: ISODate): Session[] {
  if (!isWeekday(date)) return [];
  return SLOTS.map((s) => buildSession(date, s)!);
}

export function sessionStart(s: Pick<Session, 'date' | 'slot'>): Date {
  return seoulDateTime(s.date, s.slot);
}

export function sessionEnd(s: Pick<Session, 'date' | 'slot'>): Date {
  return new Date(sessionStart(s).getTime() + SESSION_MINUTES * 60_000);
}

export function endTimeLabel(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const t = h * 60 + m + SESSION_MINUTES;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export const PLAN_INFO = {
  '1m': { label: '1개월 무제한', price: 490_000, months: 1 },
  '3m': { label: '3개월 무제한', price: 1_390_000, months: 3 },
} as const;
