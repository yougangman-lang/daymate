import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import type { AppState } from '../domain/types';
import { buildSession, sessionIdOf, sessionsOn } from '../domain/schedule';
import { memberStatus, publicExplanation, roster, trialUsage } from '../domain/selectors';
import { addDays, seoulDate, seoulDateTime, shiftWeekdays } from '../lib/time';
import { book, cancelBooking, checkBooking, confirmOffer, joinWaitlist, markAttendance, setCondition } from './booking';
import { followUpFeedback, respondFeedback, saveFeedback } from './feedback';
import { issueCoupon, markCouponDemoUsed, quote, unitDiscount, validateCode } from './mall';
import { receiveMeasurement, resendLast, saveExplanation, simulateReceive } from './measurement';
import { addMembership, createInquiry, answerInquiry } from './member';
import { demoInBodySource } from '../adapters/inbody';
import { demoPartnerGateway } from '../adapters/partner';
import { createLocalRepository, memoryKV, STORAGE_KEY, BACKUP_KEY } from '../adapters/storage';
import { createStore } from '../store/store';

// 기준 시각: 2026-11-25(수) 07:00 KST
const NOW = seoulDateTime('2026-11-25', '07:00');
const today = seoulDate(NOW);

function must<T>(r: { ok: true; state: AppState; value: T } | { ok: false; error: string }) {
  if (!r.ok) throw new Error(r.error);
  return r;
}

function fresh() {
  return createSeed(NOW);
}

describe('시간·일정', () => {
  it('서울 기준 날짜와 평일 7개 시간대', () => {
    expect(seoulDate(new Date('2026-11-24T16:30:00Z'))).toBe('2026-11-25');
    expect(sessionsOn('2026-11-25')).toHaveLength(7);
    expect(sessionsOn('2026-11-28')).toHaveLength(0); // 토요일
    const s = buildSession('2026-11-25', '10:30')!;
    expect(s.capacity).toBe(6);
    expect(s.coachIds).toHaveLength(2);
    expect(s.coachIds[0]).not.toBe(s.coachIds[1]);
  });
});

describe('예약 규칙', () => {
  it('정원 6명 초과 예약을 막고 대기 신청을 받는다', () => {
    const st = fresh();
    const full = sessionIdOf(shiftWeekdays(today, 1), '09:15');
    expect(roster(st, full)).toHaveLength(6);
    const c = checkBooking(st, 'mb01', full, NOW);
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.code).toBe('full');
    const w = must(joinWaitlist(st, 'mb01', full, NOW));
    expect(joinWaitlist(w.state, 'mb01', full, NOW).ok).toBe(false); // 중복 대기
  });

  it('같은 수업 중복 예약을 막는다', () => {
    const st = fresh();
    const sid = sessionIdOf(shiftWeekdays(today, 3), '13:00');
    const r = must(book(st, 'mb01', sid, NOW));
    const again = book(r.state, 'mb01', sid, NOW);
    expect(again.ok).toBe(false);
  });

  it('수업 7일 전부터만 예약, 지난 수업·주말은 불가', () => {
    const st = fresh();
    const in7 = addDays(today, 7); // 2026-12-02 (수)
    const in8 = addDays(today, 8);
    expect(book(st, 'mb01', sessionIdOf(in7, '08:00'), NOW).ok).toBe(true);
    const far = checkBooking(st, 'mb01', sessionIdOf(in8, '08:00'), NOW);
    expect(far.ok).toBe(false);
    if (!far.ok) expect(far.code).toBe('window');
    const pastSession = checkBooking(st, 'mb01', sessionIdOf(addDays(today, -1), '10:30'), NOW);
    expect(pastSession.ok === false && pastSession.code).toBe('past');
    expect(checkBooking(st, 'mb01', sessionIdOf('2026-11-28', '10:30'), NOW).ok).toBe(false);
  });

  it('유료 회원은 횟수 제한 없이 예약한다 (차감 없음)', () => {
    let st = fresh();
    let count = 0;
    for (let d = 0; d <= 7; d++) {
      for (const s of sessionsOn(addDays(today, d))) {
        const r = book(st, 'mb01', s.id, NOW);
        if (r.ok) {
          st = r.state;
          count++;
        }
      }
    }
    expect(count).toBeGreaterThan(20);
    expect(st.bookings.filter((b) => b.memberId === 'mb01' && b.status === 'booked').every((b) => b.kind === 'paid')).toBe(true);
  });

  it('무료체험은 총 2회 (예약+출석 기준), 출석 처리 시 사용 횟수로 연결', () => {
    let st = fresh();
    const a = sessionIdOf(today, '13:00');
    const b = sessionIdOf(shiftWeekdays(today, 2), '13:00');
    const c = sessionIdOf(shiftWeekdays(today, 3), '13:00');
    const r1 = must(book(st, 'mb04', a, NOW));
    expect(r1.value.kind).toBe('trial');
    st = must(book(r1.state, 'mb04', b, NOW)).state;
    const third = book(st, 'mb04', c, NOW);
    expect(third.ok).toBe(false);
    expect(trialUsage(st, 'mb04', NOW)).toMatchObject({ used: 0, reserved: 2, remaining: 0 });
    st = must(markAttendance(st, 'm1', r1.value.id, 'attended', NOW)).state;
    expect(trialUsage(st, 'mb04', NOW).used).toBe(1);
    // 체험 2회 모두 사용한 회원
    expect(book(fresh(), 'mb12', c, NOW).ok).toBe(false);
  });

  it('만료·휴회 회원은 예약할 수 없다', () => {
    const st = fresh();
    const sid = sessionIdOf(shiftWeekdays(today, 2), '08:00');
    expect(book(st, 'mb06', sid, NOW).ok).toBe(false);
    expect(book(st, 'mb07', sid, NOW).ok).toBe(false);
  });

  it('취소하면 대기자에게 알림만 보내고, 확정 시 정원을 다시 확인한다', () => {
    let st = fresh();
    const full = sessionIdOf(shiftWeekdays(today, 1), '09:15');
    st = must(joinWaitlist(st, 'mb01', full, NOW)).state;
    const target = st.bookings.find((b) => b.sessionId === full && b.memberId === 'mb03')!;
    st = must(cancelBooking(st, 'mb03', target.id, NOW)).state;
    const offers = st.waitlist.filter((w) => w.sessionId === full && w.status === 'offered');
    expect(offers.map((o) => o.memberId).sort()).toEqual(['mb01', 'mb04']);
    expect(roster(st, full)).toHaveLength(5); // 자동 확정 아님
    expect(st.notifications.some((n) => n.memberId === 'mb01' && n.type === 'waitlist')).toBe(true);

    const first = offers.find((o) => o.memberId === 'mb04')!;
    const r = must(confirmOffer(st, 'mb04', first.id, NOW));
    expect(r.value.booked).toBe(true);
    st = r.state;
    const second = st.waitlist.find((w) => w.memberId === 'mb01' && w.sessionId === full)!;
    const r2 = must(confirmOffer(st, 'mb01', second.id, NOW));
    expect(r2.value.booked).toBe(false); // 그 사이 정원이 참
    expect(r2.state.waitlist.find((w) => w.id === second.id)!.status).toBe('waiting');
    expect(roster(r2.state, full)).toHaveLength(6);
  });

  it('컨디션 입력이 예약에 저장되고 출석은 매니저만, 수업 당일부터', () => {
    let st = fresh();
    const sid = sessionIdOf(shiftWeekdays(today, 1), '14:15');
    const bk = st.bookings.find((b) => b.sessionId === sid && b.memberId === 'mb01')!;
    st = must(setCondition(st, 'mb01', bk.id, { level: 'discomfort', tags: ['무릎', '없는태그'], memo: '계단' }, NOW)).state;
    expect(st.bookings.find((b) => b.id === bk.id)!.condition).toMatchObject({ level: 'discomfort', tags: ['무릎'], memo: '계단' });
    expect(markAttendance(st, 'c1', bk.id, 'attended', NOW).ok).toBe(false);
    expect(markAttendance(st, 'm1', bk.id, 'attended', NOW).ok).toBe(false); // 아직 날짜 전
    const later = seoulDateTime(shiftWeekdays(today, 1), '15:30');
    expect(markAttendance(st, 'm1', bk.id, 'attended', later).ok).toBe(true);
  });
});

describe('피드백', () => {
  it('출석한 담당 수업 회원에게만, 공개 후에만 보이고 응답이 반영된다', () => {
    let st = fresh();
    const sid = sessionIdOf(today, '13:00');
    const b = st.bookings.find((x) => x.sessionId === sid && x.memberId === 'mb08')!;
    const s = buildSession(today, '13:00')!;
    const coach = s.coachIds[0];
    const other = ['c1', 'c2', 'c3', 'c4'].find((c) => !s.coachIds.includes(c as never))!;
    const input = { activity: '의자 일어서기', didWell: '자세 유지', nextAdjust: '휴식 60초' };
    expect(saveFeedback(st, coach, b.id, input, true, NOW).ok).toBe(false); // 출석 전
    st = must(markAttendance(st, 'm1', b.id, 'attended', NOW)).state;
    expect(saveFeedback(st, other, b.id, input, true, NOW).ok).toBe(false); // 담당 아님
    const draft = must(saveFeedback(st, coach, b.id, input, false, NOW));
    expect(draft.value.status).toBe('draft');
    const pub = must(saveFeedback(draft.state, coach, b.id, input, true, NOW));
    expect(pub.state.feedback.filter((f) => f.bookingId === b.id)).toHaveLength(1);
    st = must(respondFeedback(pub.state, 'mb08', pub.value.id, 'need_more', NOW)).state;
    expect(st.feedback.find((f) => f.id === pub.value.id)!.response).toBe('need_more');
    st = must(followUpFeedback(st, coach, pub.value.id, '휴식은 앉아서 해요', NOW)).state;
    expect(st.feedback.find((f) => f.id === pub.value.id)!.followUp?.text).toBe('휴식은 앉아서 해요');
    // 피드백 있는 출석은 되돌릴 수 없음
    expect(markAttendance(st, 'm1', b.id, 'absent', NOW).ok).toBe(false);
  });
});

describe('측정 수신과 설명 공개', () => {
  it('중복 수신을 막고, 설명은 공개 전에는 회원에게 보이지 않는다', () => {
    let st = fresh();
    const before = st.measurements.filter((m) => m.memberId === 'mb01').length;
    const r = must(simulateReceive(st, demoInBodySource, 'mb01', NOW));
    st = r.state;
    expect(st.measurements.filter((m) => m.memberId === 'mb01')).toHaveLength(before + 1);
    expect(r.value).toMatchObject({ memberId: 'mb01', source: 'demo' });
    expect(r.value.explanation.status).toBe('pending');
    expect(publicExplanation(r.value)).toBeNull();
    expect(resendLast(st, NOW).ok).toBe(false);
    const p = { externalId: r.value.externalId, memberId: 'mb01', measuredAt: r.value.measuredAt, device: 'x', source: 'demo' as const, values: r.value.values };
    expect(receiveMeasurement(st, p, NOW).ok).toBe(false);
    expect(receiveMeasurement(st, { ...p, externalId: 'x-1', memberId: 'nobody' }, NOW).ok).toBe(false);

    st = must(saveExplanation(st, 'm1', r.value.id, { text: '설명 초안입니다. 아직 비공개.', coachNote: '' }, false, NOW)).state;
    expect(publicExplanation(st.measurements.find((m) => m.id === r.value.id))).toBeNull();
    expect(saveExplanation(st, 'c1', r.value.id, { text: '코치는 공개 불가입니다.', coachNote: '' }, true, NOW).ok).toBe(false);
    st = must(saveExplanation(st, 'm1', r.value.id, { text: '공개한 설명입니다. 다음 측정과 함께 봐요.', coachNote: '무릎 주의' }, true, NOW)).state;
    expect(publicExplanation(st.measurements.find((m) => m.id === r.value.id))).toContain('공개한 설명');
    expect(st.notifications.some((n) => n.memberId === 'mb01' && n.type === 'explanation')).toBe(true);
  });
});

describe('제휴몰', () => {
  it('할인 계산: 정률은 10원 미만 내림, 정액, 무료배송 기준', () => {
    const st = fresh();
    const p1 = st.products.find((p) => p.id === 'pd1')!; // 39,000 15%
    expect(unitDiscount(p1)).toBe(5850);
    expect(quote(p1, 1, true)).toMatchObject({ subtotal: 33150, shipping: 0, total: 33150 });
    expect(quote(p1, 1, false)).toMatchObject({ subtotal: 39000, shipping: 0 });
    const p5 = st.products.find((p) => p.id === 'pd5')!; // 9,900 10%
    expect(unitDiscount(p5)).toBe(990);
    expect(quote(p5, 1, true)).toMatchObject({ subtotal: 8910, shipping: 2500, total: 11410 });
    expect(quote(p5, 3, true)).toMatchObject({ subtotal: 26730, shipping: 0, total: 26730 });
    expect(unitDiscount({ listPrice: 12345, discountType: 'rate', discountValue: 15 })).toBe(1850);
    const p2 = st.products.find((p) => p.id === 'pd2')!;
    expect(quote(p2, 2, true)).toMatchObject({ discount: 8000, total: 58000 + 3000 });
  });

  it('유효 회원만 발급, 반복 발급 시 기존 코드, 만료·체험·휴회·비활성 제한', () => {
    let st = fresh();
    const r = must(issueCoupon(st, demoPartnerGateway, 'mb01', 'pd1', NOW));
    expect(r.value.reissued).toBe(false);
    st = r.state;
    const again = must(issueCoupon(st, demoPartnerGateway, 'mb01', 'pd1', NOW));
    expect(again.value.reissued).toBe(true);
    expect(again.value.coupon.code).toBe(r.value.coupon.code);
    expect(again.state.coupons.filter((c) => c.memberId === 'mb01')).toHaveLength(1);
    expect(issueCoupon(st, demoPartnerGateway, 'mb06', 'pd1', NOW).ok).toBe(false); // 만료
    expect(issueCoupon(st, demoPartnerGateway, 'mb04', 'pd1', NOW).ok).toBe(false); // 체험
    expect(issueCoupon(st, demoPartnerGateway, 'mb07', 'pd1', NOW).ok).toBe(false); // 휴회
    expect(issueCoupon(st, demoPartnerGateway, 'mb01', 'pd4', NOW).ok).toBe(false); // 혜택 만료
    expect(issueCoupon(st, demoPartnerGateway, 'mb01', 'pd6', NOW).ok).toBe(false); // 비활성
    // 쿠폰 만료일은 회원권 종료일을 넘지 않는다
    expect(r.value.coupon.expiresOn <= memberStatusEnd(st)).toBe(true);
  });

  it('코드 검증: 잘못된 코드·다른 상품·다른 회원·시연 사용 처리', () => {
    let st = fresh();
    const r = must(issueCoupon(st, demoPartnerGateway, 'mb01', 'pd1', NOW));
    st = r.state;
    const code = r.value.coupon.code;
    expect(validateCode(st, 'mb01', 'pd1', code.toLowerCase(), NOW).ok).toBe(true);
    expect(validateCode(st, 'mb01', 'pd1', 'ONYU-XXXX-XXXX', NOW).ok).toBe(false);
    expect(validateCode(st, 'mb01', 'pd2', code, NOW).ok).toBe(false);
    expect(validateCode(st, 'mb02', 'pd1', code, NOW).ok).toBe(false);
    st = must(markCouponDemoUsed(st, 'mb01', 'pd1', code, NOW)).state;
    expect(validateCode(st, 'mb01', 'pd1', code, NOW).ok).toBe(false);
    expect(st.mallEvents.filter((e) => e.type === 'coupon_demo_used')).toHaveLength(1);
  });
});

function memberStatusEnd(st: AppState) {
  const s = memberStatus(st, st.members.find((m) => m.id === 'mb01')!, NOW);
  return s.kind === 'paid' ? s.membership.endDate : '';
}

describe('회원권·문의', () => {
  it('회원권 등록은 기존 기록을 유지하고 겹치는 기간을 막는다', () => {
    const st = fresh();
    expect(addMembership(st, 'm1', 'mb01', '1m', today, NOW).ok).toBe(false);
    const r = must(addMembership(st, 'm1', 'mb06', '3m', today, NOW));
    const m = r.state.members.find((x) => x.id === 'mb06')!;
    expect(m.memberships).toHaveLength(2);
    expect(m.membershipLog[0].action).toBe('회원권 등록');
    expect(memberStatus(r.state, m, NOW).kind).toBe('paid');
    expect(addMembership(st, 'c1', 'mb06', '1m', today, NOW).ok).toBe(false);
  });

  it('도움 요청이 문의 목록에 생기고 답변이 회원 알림으로 간다', () => {
    let st = fresh();
    st = must(createInquiry(st, 'mb01', 'booking', '예약 변경 도와주세요', NOW)).state;
    const q = st.inquiries[0];
    expect(q).toMatchObject({ memberId: 'mb01', status: 'open' });
    st = must(answerInquiry(st, 'm2', q.id, '내 정보에서 취소 후 다시 예약해 주세요', NOW)).state;
    expect(st.inquiries[0].status).toBe('answered');
    expect(st.notifications[0]).toMatchObject({ memberId: 'mb01', type: 'inquiry' });
  });
});

describe('저장소', () => {
  it('정상 데이터는 유지, 손상 데이터는 백업 후 복구, 저장 실패는 상태를 바꾸지 않는다', () => {
    const kv = memoryKV();
    const repo = createLocalRepository(kv);
    const first = repo.load(NOW);
    expect(first.notice).toBe('fresh');
    repo.save({ ...first.state, demo: { ...first.state.demo, memberId: 'mb02' } });
    const second = repo.load(NOW);
    expect(second.notice).toBeNull();
    expect(second.state.demo.memberId).toBe('mb02');

    kv.setItem(STORAGE_KEY, '{broken');
    const third = repo.load(NOW);
    expect(third.notice).toBe('corrupt');
    expect(kv.getItem(BACKUP_KEY)).toBe('{broken');

    kv.setItem(STORAGE_KEY, JSON.stringify({ ...first.state, version: 0 }));
    expect(repo.load(NOW).notice).toBe('version');

    const failing = { ...memoryKV(), setItem: () => { throw new Error('quota'); } };
    const store = createStore(createLocalRepository(failing));
    const before = store.get();
    const r = store.run((s, n) => createInquiry(s, 'mb01', 'other', '저장 실패 테스트', n));
    expect(r.ok).toBe(false);
    expect(store.get()).toBe(before);
  });
});
