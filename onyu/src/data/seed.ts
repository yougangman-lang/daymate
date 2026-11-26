// 시연 데이터. 모든 회원·건강 정보·가격·제휴 조건은 가상이다.
// 실행 날짜(Asia/Seoul)를 기준으로 과거 기록과 앞으로의 예약을 만든다.
import type { AppState, Booking, BodyValues, ConditionReport, Feedback, Measurement, Member, Membership, PlanType, Product, Staff } from '../domain/types';
import { buildSession, getSession, PLAN_INFO, sessionIdOf } from '../domain/schedule';
import { addDays, addMonths, seoulDate, seoulDateTime, shiftWeekdays } from '../lib/time';

export const STATE_VERSION = 1;

const MANAGER_Q = '건강운동관리사 (운영계획상 요구 자격)';
const COACH_Q = '건강운동관리사 + 2급 생활스포츠지도사 (운영계획상 요구 자격)';

export const STAFF: Staff[] = [
  { id: 'm1', name: '이현석', kind: 'manager', plannedQualification: MANAGER_Q },
  { id: 'm2', name: '정연태', kind: 'manager', plannedQualification: MANAGER_Q },
  { id: 'm3', name: '변지원', kind: 'manager', plannedQualification: MANAGER_Q },
  { id: 'm4', name: '기윤재', kind: 'manager', plannedQualification: MANAGER_Q },
  { id: 'c1', name: '한서진', kind: 'coach', plannedQualification: COACH_Q, contract: true },
  { id: 'c2', name: '오도현', kind: 'coach', plannedQualification: COACH_Q, contract: true },
  { id: 'c3', name: '민채율', kind: 'coach', plannedQualification: COACH_Q, contract: true },
  { id: 'c4', name: '강태오', kind: 'coach', plannedQualification: COACH_Q, contract: true },
];

function membership(id: string, plan: PlanType, startDate: string, status: Membership['status'] = 'active'): Membership {
  return {
    id,
    plan,
    startDate,
    endDate: addDays(addMonths(startDate, PLAN_INFO[plan].months), -1),
    status,
    price: PLAN_INFO[plan].price,
    createdAt: seoulDateTime(addDays(startDate, -1), '10:00').toISOString(),
  };
}

const defaultPrefs = (): Member['prefs'] => ({
  fontScale: 'normal',
  speechRate: 'normal',
  notifications: { feedback: true, explanation: true, waitlist: true, inquiry: true },
});

function member(p: Partial<Member> & Pick<Member, 'id' | 'name' | 'ageGroup' | 'memberNo' | 'joinedAt'>): Member {
  return {
    memberships: [],
    membershipLog: [],
    trialTotal: 2,
    precautions: [],
    careNotes: [],
    questionnaire: { updatedAt: p.joinedAt, conditions: [], pain: '특이사항 없음', exerciseHistory: '-', fitnessSummary: '-' },
    prefs: defaultPrefs(),
    ...p,
  };
}

function values(weight: number, muscle: number, fat: number, heightM: number, water: number, protein: number, mineral: number): BodyValues {
  return {
    weight,
    skeletalMuscle: muscle,
    bodyFatMass: fat,
    bodyFatPercent: Math.round((fat / weight) * 1000) / 10,
    bmi: Math.round((weight / (heightM * heightM)) * 10) / 10,
    totalBodyWater: water,
    protein,
    mineral,
  };
}

export function createSeed(now: Date): AppState {
  const today = seoulDate(now);
  const iso = (date: string, time: string) => seoulDateTime(date, time).toISOString();
  const past = (n: number) => shiftWeekdays(today, -n);
  const next = (n: number) => shiftWeekdays(today, n);

  // ── 회원 12명 (가상) ──
  const mb01Start = addDays(today, -12);
  const members: Member[] = [
    member({
      id: 'mb01',
      name: '한보람',
      ageGroup: '60대 후반',
      memberNo: 'ON-0101',
      joinedAt: addMonths(mb01Start, -2),
      memberships: [
        membership('ms01a', '1m', addMonths(mb01Start, -2)),
        membership('ms01b', '1m', addMonths(mb01Start, -1)),
        membership('ms01c', '1m', mb01Start),
      ],
      membershipLog: [
        { id: 'lg01', at: iso(addDays(mb01Start, -1), '10:00'), by: 'm2', action: '회원권 등록', detail: `1개월 무제한 ${mb01Start} 시작 (연장)` },
      ],
      precautions: ['오른쪽 무릎: 깊게 앉는 동작 대신 의자 높이 유지', '혈압약 복용 중: 운동 전 혈압 확인'],
      careNotes: [
        { id: 'cn01b', at: iso(past(9), '11:40'), by: 'm1', kind: 'adjust', text: '스쿼트를 의자 잡고 일어서기로 바꾸고 10회 × 2세트, 세트 사이 90초 쉬기.' },
        { id: 'cn01a', at: iso(addMonths(mb01Start, -2), '11:00'), by: 'm2', kind: 'consult', text: '첫 상담: 계단을 편하게 오르내리는 것이 목표. 주 3회 걷기 중.' },
      ],
      questionnaire: {
        updatedAt: addMonths(mb01Start, -2),
        conditions: ['고혈압 약 복용 중 (가상)'],
        pain: '오른쪽 무릎 – 계단을 내려갈 때 불편함',
        exerciseHistory: '주 3회 30분 걷기, 근력운동 경험은 적음',
        fitnessSummary: '의자 일어서기 30초 13회 · 2분 제자리 걷기 88회 (가상 기록)',
      },
      exercisePlan: {
        text: '무릎 부담을 줄이면서 다리 힘을 기르는 데 집중해요. 의자 잡고 일어서기는 10회씩 2세트로 시작하고 쉬는 시간을 넉넉히 가져요. 게임에서는 보폭을 작게 해서 방향 바꾸기를 연습해요.',
        by: 'm1',
        updatedAt: iso(past(8), '12:00'),
      },
    }),
    member({ id: 'mb02', name: '오정희', ageGroup: '70대 초반', memberNo: 'ON-0102', joinedAt: addDays(today, -40), memberships: [membership('ms02', '3m', addDays(today, -40))], precautions: ['왼쪽 무릎 인공관절 수술 이력: 점프·깊은 굽힘 금지'] }),
    member({ id: 'mb03', name: '최민수', ageGroup: '60대 초반', memberNo: 'ON-0103', joinedAt: addDays(today, -78), memberships: [membership('ms03', '3m', addDays(today, -78))] }),
    member({ id: 'mb04', name: '서영자', ageGroup: '60대 후반', memberNo: 'ON-0104', joinedAt: addDays(today, -2) }),
    member({ id: 'mb05', name: '이상철', ageGroup: '50대 후반', memberNo: 'ON-0105', joinedAt: addDays(today, -9), precautions: ['허리 디스크 이력: 허리 숙이는 동작 범위 줄이기'] }),
    member({ id: 'mb06', name: '박금순', ageGroup: '70대 초반', memberNo: 'ON-0106', joinedAt: addDays(today, -50), memberships: [membership('ms06', '1m', addDays(today, -50))] }),
    member({ id: 'mb07', name: '윤재복', ageGroup: '60대 후반', memberNo: 'ON-0107', joinedAt: addDays(today, -30), memberships: [membership('ms07', '3m', addDays(today, -30), 'paused')] }),
    member({ id: 'mb08', name: '장미경', ageGroup: '60대 초반', memberNo: 'ON-0108', joinedAt: addDays(today, -20), memberships: [membership('ms08', '1m', addDays(today, -20))] }),
    member({ id: 'mb09', name: '김동훈', ageGroup: '50대 중반', memberNo: 'ON-0109', joinedAt: addDays(today, -15), memberships: [membership('ms09', '3m', addDays(today, -15))] }),
    member({ id: 'mb10', name: '송옥자', ageGroup: '70대 중반', memberNo: 'ON-0110', joinedAt: addDays(today, -6), memberships: [membership('ms10', '1m', addDays(today, -6))], precautions: ['어지럼증 경험: 고개를 빠르게 돌리는 동작 피하기'] }),
    member({ id: 'mb11', name: '임형택', ageGroup: '60대 중반', memberNo: 'ON-0111', joinedAt: addDays(today, -60), memberships: [membership('ms11', '3m', addDays(today, -60))] }),
    member({ id: 'mb12', name: '노은희', ageGroup: '50대 후반', memberNo: 'ON-0112', joinedAt: addDays(today, -12) }),
  ];

  // ── 예약 ──
  const bookings: Booking[] = [];
  let seq = 0;
  const bk = (memberId: string, date: string, slot: string, status: Booking['status'], kind: Booking['kind'] = 'paid', condition?: Omit<ConditionReport, 'at'>) => {
    const s = buildSession(date, slot)!;
    const id = `bk-seed-${String(++seq).padStart(3, '0')}`;
    const b: Booking = { id, sessionId: s.id, memberId, status, kind, createdAt: iso(addDays(date, -3), '19:00') };
    if (status === 'attended' || status === 'absent') {
      b.attendanceBy = s.managerId;
      b.attendanceAt = iso(date, slot);
    }
    if (condition) b.condition = { ...condition, at: iso(addDays(date, -1), '20:00') };
    bookings.push(b);
    return b;
  };

  // 지난 수업 (출석 기록)
  const mbPast: Record<number, Booking> = {};
  for (const n of [1, 3, 5, 7, 9]) {
    mbPast[n] = bk('mb01', past(n), '10:30', 'attended', 'paid', n === 1 ? { level: 'good', tags: [], memo: '' } : undefined);
    bk('mb08', past(n), '10:30', 'attended');
    bk('mb09', past(n), '10:30', n === 5 ? 'absent' : 'attended');
    if (n <= 3) bk('mb11', past(n), '10:30', 'attended');
  }
  bk('mb05', past(4), '13:00', 'attended', 'trial');
  bk('mb02', past(4), '13:00', 'attended');
  bk('mb12', past(6), '13:00', 'attended', 'trial');
  bk('mb12', past(8), '13:00', 'attended', 'trial');
  bk('mb03', past(6), '13:00', 'attended');
  bk('mb02', past(2), '09:15', 'attended');
  bk('mb03', past(2), '09:15', 'attended');
  bk('mb10', past(2), '09:15', 'attended');

  // 오늘 수업 (평일인 경우)
  if (buildSession(today, '09:15')) {
    bk('mb02', today, '09:15', 'booked', 'paid', { level: 'good', tags: [], memo: '' });
    bk('mb11', today, '09:15', 'booked');
    bk('mb08', today, '13:00', 'booked', 'paid', { level: 'tired', tags: ['잠을 설쳤어요'], memo: '' });
    bk('mb09', today, '13:00', 'booked');
    bk('mb03', today, '15:30', 'booked');
  }

  // 앞으로의 수업: 마감(6/6), 잔여 1석(5/6), 여유 있는 수업
  const n1 = next(1);
  const n2 = next(2);
  const n3 = next(3);
  bk('mb02', n1, '09:15', 'booked', 'paid', { level: 'discomfort', tags: ['무릎'], memo: '계단 내려갈 때 시큰해요' });
  bk('mb03', n1, '09:15', 'booked');
  bk('mb08', n1, '09:15', 'booked');
  bk('mb09', n1, '09:15', 'booked');
  bk('mb10', n1, '09:15', 'booked', 'paid', { level: 'tired', tags: ['잠을 설쳤어요'], memo: '' });
  bk('mb11', n1, '09:15', 'booked');
  bk('mb01', n1, '14:15', 'booked');
  bk('mb05', n1, '14:15', 'booked', 'trial');
  bk('mb09', n1, '14:15', 'booked');
  for (const id of ['mb02', 'mb03', 'mb08', 'mb10', 'mb11']) bk(id, n2, '10:30', 'booked');
  bk('mb08', n3, '09:15', 'booked');
  bk('mb11', n3, '09:15', 'booked');

  const waitlist = [
    { id: 'wt-seed-1', sessionId: sessionIdOf(n1, '09:15'), memberId: 'mb04', status: 'waiting' as const, createdAt: iso(today, '08:30') },
  ];

  // ── 측정 기록 ──
  const ms = (id: string, memberId: string, date: string, v: BodyValues, status: Measurement['explanation']['status'], text: string, coachNote = ''): Measurement => ({
    id,
    externalId: `demo-seed-${id}`,
    memberId,
    measuredAt: iso(date, '11:40'),
    receivedAt: iso(date, '11:41'),
    source: 'demo',
    device: '시연용 체성분 측정 기록',
    values: v,
    explanation: {
      status,
      text,
      coachNote,
      updatedBy: status === 'pending' ? undefined : 'm1',
      updatedAt: status === 'pending' ? undefined : iso(date, '15:00'),
      publishedAt: status === 'published' ? iso(date, '15:00') : undefined,
    },
  });
  const measurements: Measurement[] = [
    ms('ms-seed-01', 'mb01', past(48), values(63.8, 22.1, 20.5, 1.6, 30.0, 8.0, 2.9), 'published',
      '첫 측정 결과예요. 오늘 값은 앞으로 변화를 비교하는 기준이 돼요. 기초 체력 측정에서 다리 힘을 키우면 계단이 편해질 수 있어 하체 운동 위주로 시작할게요.'),
    ms('ms-seed-02', 'mb01', past(27), values(63.5, 22.4, 20.1, 1.6, 30.3, 8.1, 2.9), 'published',
      '골격근량이 지난 측정보다 0.3kg 늘었어요. 수분 상태에 따라 값이 달라질 수 있어 한 번의 변화로 판단하지는 않아요. 지금처럼 꾸준히 오시면 다음 측정에서 함께 확인해요.'),
    ms('ms-seed-03', 'mb01', past(8), values(63.2, 22.6, 19.8, 1.6, 30.5, 8.2, 2.9), 'published',
      '두 달 전 첫 측정보다 골격근량이 조금씩 늘고 체지방량은 조금씩 줄었어요. 작은 변화라 다음 측정과 함께 보겠지만, 수업에서 일어서기 동작이 안정적으로 바뀌고 있어요.',
      '오른쪽 무릎 불편감이 있어요. 의자 일어서기는 의자 높이를 유지하고 반복 수를 천천히 늘려 주세요.'),
    ms('ms-seed-04', 'mb02', past(30), values(58.4, 19.8, 19.6, 1.55, 27.4, 7.3, 2.6), 'published',
      '첫 측정 결과예요. 앞으로의 변화를 비교하는 기준이 돼요. 무릎 수술 이력을 고려해 상체·코어 위주로 시작할게요.'),
    ms('ms-seed-05', 'mb02', past(1), values(58.1, 19.9, 19.3, 1.55, 27.6, 7.3, 2.6), 'pending',
      '골격근량이 지난 측정보다 0.1kg 늘었어요. 측정 전 수분·식사·시간에 따라 값이 조금씩 달라질 수 있어 한 번의 변화만으로 좋아졌다거나 나빠졌다고 보지는 않아요. 다음 측정과 수업 중 움직임을 함께 살펴볼게요.'),
    ms('ms-seed-06', 'mb08', past(10), values(55.0, 20.4, 15.9, 1.58, 28.9, 7.6, 2.7), 'published',
      '첫 측정 결과예요. 앞으로 변화를 비교하는 기준이 돼요. 균형 동작을 조금 더 연습해 볼게요.'),
  ];

  // ── 코치 피드백 (명단·출석과 연결) ──
  const fbFor = (b: Booking, id: string, f: Pick<Feedback, 'activity' | 'didWell' | 'nextAdjust' | 'status'> & Partial<Feedback>): Feedback => {
    const s = getSession(b.sessionId)!;
    const t = iso(s.date, '16:00');
    return { id, bookingId: b.id, sessionId: b.sessionId, memberId: b.memberId, coachId: s.coachIds[0], createdAt: t, updatedAt: t, publishedAt: f.status === 'published' ? t : undefined, ...f };
  };
  const mb08Past1 = bookings.find((b) => b.memberId === 'mb08' && b.sessionId === mbPast[1].sessionId)!;
  const feedback: Feedback[] = [
    fbFor(mbPast[3], 'fb-seed-1', {
      activity: '의자 잡고 일어서기 10회 × 2세트, Color Route 3바퀴',
      didWell: '일어설 때 무릎이 안쪽으로 모이지 않도록 끝까지 신경 쓰셨어요.',
      nextAdjust: '쉬는 시간을 90초에서 60초로 조금 줄여 볼게요.',
      status: 'published',
      response: 'understood',
      respondedAt: iso(past(3), '19:00'),
    }),
    fbFor(mbPast[1], 'fb-seed-2', {
      activity: '밴드 당기기 12회 × 2세트, Target Ball 팀 경기',
      didWell: '공을 굴릴 때 허리를 펴고 무릎을 살짝 굽혀 안정적인 자세를 유지하셨어요.',
      nextAdjust: '밴드를 한 단계 가벼운 색으로 바꿔 어깨 긴장을 줄여 볼게요.',
      status: 'published',
    }),
    fbFor(mb08Past1, 'fb-seed-3', {
      activity: '밴드 당기기, Target Ball',
      didWell: '균형 잡기 동작에서 시선을 앞에 두셨어요.',
      nextAdjust: '',
      status: 'draft',
    }),
  ];

  // ── 제휴 상품 (가상) ──
  const products: Product[] = [
    { id: 'pd1', name: '데일리 프로틴 밀크', seller: '가온식품(가상)', category: 'protein', volume: '190ml × 24개', ingredients: '우유단백농축물, 정제수, 바닐라향 (시연 정보)', allergens: '우유, 대두', listPrice: 39_000, discountType: 'rate', discountValue: 15, shippingFee: 3_000, freeShippingOver: 30_000, benefitStart: addDays(today, -20), benefitEnd: addDays(today, 40), active: true, art: { shape: 'carton', color: '#526547' } },
    { id: 'pd2', name: '든든 단백질 음료 초코', seller: '누리웰(가상)', category: 'protein', volume: '250ml × 18개', ingredients: '분리대두단백, 코코아분말, 정제수 (시연 정보)', allergens: '대두, 우유', listPrice: 33_000, discountType: 'amount', discountValue: 4_000, shippingFee: 3_000, freeShippingOver: 0, benefitStart: addDays(today, -10), benefitEnd: addDays(today, 50), active: true, art: { shape: 'bottle', color: '#6B4A33' } },
    { id: 'pd3', name: '고소한 견과 바', seller: '하루곡간(가상)', category: 'snack', volume: '30g × 20개', ingredients: '아몬드, 호두, 귀리, 올리고당 (시연 정보)', allergens: '호두, 땅콩 같은 시설 제조', listPrice: 24_000, discountType: 'rate', discountValue: 10, shippingFee: 3_000, freeShippingOver: 30_000, benefitStart: addDays(today, -5), benefitEnd: addDays(today, 25), active: true, art: { shape: 'bar', color: '#A0703C' } },
    { id: 'pd4', name: '구운 두부칩', seller: '하루곡간(가상)', category: 'snack', volume: '40g × 12봉', ingredients: '두부, 쌀가루, 해바라기유 (시연 정보)', allergens: '대두, 밀', listPrice: 18_000, discountType: 'rate', discountValue: 20, shippingFee: 3_000, freeShippingOver: 30_000, benefitStart: addDays(today, -60), benefitEnd: addDays(today, -3), active: true, art: { shape: 'pouch', color: '#B98B4E' } },
    { id: 'pd5', name: '볶은 보리차 티백', seller: '맑은들(가상)', category: 'drink', volume: '10g × 50개', ingredients: '볶은 보리 100% (시연 정보)', allergens: '없음 (시연 정보)', listPrice: 9_900, discountType: 'rate', discountValue: 10, shippingFee: 2_500, freeShippingOver: 20_000, benefitStart: addDays(today, -30), benefitEnd: addDays(today, 60), active: true, art: { shape: 'box', color: '#7C6A4F' } },
    { id: 'pd6', name: '무가당 검은콩 두유', seller: '누리웰(가상)', category: 'drink', volume: '190ml × 24개', ingredients: '검은콩, 정제수 (시연 정보)', allergens: '대두', listPrice: 21_000, discountType: 'amount', discountValue: 3_000, shippingFee: 3_000, freeShippingOver: 0, benefitStart: addDays(today, -15), benefitEnd: addDays(today, 45), active: false, art: { shape: 'can', color: '#3E3A33' } },
  ];

  const coupons = [{ id: 'cp-seed-1', code: 'ONYU-SEED-2X7K', memberId: 'mb02', productId: 'pd1', issuedAt: iso(past(5), '14:00'), expiresOn: addDays(today, 40) }];
  const mallEvents = [
    { id: 'ev-seed-1', type: 'coupon_issued' as const, memberId: 'mb02', productId: 'pd1', at: iso(past(5), '14:00') },
    { id: 'ev-seed-2', type: 'purchase_page_open' as const, memberId: 'mb02', productId: 'pd1', at: iso(past(5), '14:02') },
  ];

  const inquiries = [
    { id: 'iq-seed-1', memberId: 'mb03', category: 'membership' as const, message: '회원권이 곧 끝나는데 연장은 어떻게 하나요?', createdAt: iso(past(1), '17:20'), status: 'open' as const },
    { id: 'iq-seed-2', memberId: 'mb01', category: 'other' as const, message: '샤워실에 수건이 준비되어 있나요?', createdAt: iso(past(6), '09:00'), status: 'answered' as const, answer: '네, 수건과 기본 세면용품이 준비돼 있어요. 개인 세면도구를 가져오셔도 좋아요.', answeredBy: 'm3', answeredAt: iso(past(6), '11:00') },
  ];

  const notifications = [
    { id: 'nt-seed-1', memberId: 'mb01', type: 'feedback' as const, title: '코치 피드백이 도착했어요', body: '지난 수업 피드백을 확인해 보세요.', link: '/member/body#feedback', createdAt: iso(past(1), '16:00'), read: false },
    { id: 'nt-seed-2', memberId: 'mb01', type: 'inquiry' as const, title: '문의에 답변이 왔어요', body: '기타 문의', link: '/member/me#inquiries', createdAt: iso(past(6), '11:00'), read: true },
    { id: 'nt-seed-3', memberId: 'mb02', type: 'measurement' as const, title: '새 측정 결과가 들어왔어요', body: '쉬운 설명은 매니저가 확인한 뒤 알려드려요.', link: '/member/body', createdAt: iso(past(1), '11:41'), read: false },
  ];

  const firstCoach = buildSession(past(1), '10:30')!.coachIds[0];

  return {
    version: STATE_VERSION,
    demo: { view: 'member', staffKind: 'manager', memberId: 'mb01', managerId: 'm1', coachId: firstCoach, clockOffsetMs: 0, seededAt: now.toISOString(), eventSeq: 0, idSeq: 0 },
    staff: STAFF,
    members,
    bookings,
    waitlist,
    measurements,
    feedback,
    products,
    coupons,
    mallEvents,
    inquiries,
    notifications,
  };
}
