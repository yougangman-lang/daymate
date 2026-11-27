// 온유 제휴몰: 가격 계산, 회원 자격 확인, 개인별 할인코드 발급, 구매 절차 시연.
// 가격은 모두 정수 원. 정률 할인은 10원 미만을 버린다(내림). 실제 판매·결제·정산은 없다.
import type { AppState, Coupon, MallEventType, Product, Result } from '../domain/types';
import type { PartnerCouponGateway } from '../adapters/partner';
import { findMember, memberStatus } from '../domain/selectors';
import { seoulDate } from '../lib/time';
import { fail, isStaff, ok, uid } from './common';

export const CATEGORY_LABEL = { protein: '단백질 음료', snack: '간식', drink: '기타 음료' } as const;

export function unitDiscount(p: Pick<Product, 'listPrice' | 'discountType' | 'discountValue'>): number {
  if (p.discountType === 'rate') return Math.floor((p.listPrice * p.discountValue) / 100 / 10) * 10;
  return Math.min(p.discountValue, p.listPrice);
}

export function memberPrice(p: Product): number {
  return p.listPrice - unitDiscount(p);
}

export function discountLabel(p: Product): string {
  return p.discountType === 'rate' ? `${p.discountValue}% 할인` : `${p.discountValue.toLocaleString('ko-KR')}원 할인`;
}

export function shippingFor(p: Product, subtotal: number): number {
  if (p.freeShippingOver > 0 && subtotal >= p.freeShippingOver) return 0;
  return p.shippingFee;
}

export function shippingLabel(p: Product): string {
  if (p.shippingFee === 0) return '배송비 무료';
  if (p.freeShippingOver > 0) return `배송비 ${p.shippingFee.toLocaleString('ko-KR')}원 (${p.freeShippingOver.toLocaleString('ko-KR')}원 이상 무료)`;
  return `배송비 ${p.shippingFee.toLocaleString('ko-KR')}원`;
}

/** 수량·코드 적용 여부에 따른 최종 금액. 무료배송 기준은 할인 적용 후 상품 금액으로 판단한다. */
export function quote(p: Product, qty: number, withCode: boolean) {
  const q = Math.max(1, Math.min(10, Math.floor(qty)));
  const listSubtotal = p.listPrice * q;
  const discount = withCode ? unitDiscount(p) * q : 0;
  const subtotal = listSubtotal - discount;
  const shipping = shippingFor(p, subtotal);
  return { qty: q, listSubtotal, discount, subtotal, shipping, total: subtotal + shipping };
}

export type BenefitState = 'valid' | 'inactive' | 'notStarted' | 'expired';
export function benefitState(p: Product, now: Date): BenefitState {
  const today = seoulDate(now);
  if (!p.active) return 'inactive';
  if (today < p.benefitStart) return 'notStarted';
  if (today > p.benefitEnd) return 'expired';
  return 'valid';
}

export const BENEFIT_LABEL: Record<BenefitState, string> = {
  valid: '혜택 진행 중',
  inactive: '판매 중지',
  notStarted: '혜택 시작 전',
  expired: '혜택 기간 종료',
};

export type Eligibility = { ok: true; expiresOn: string } | { ok: false; reason: string; code: 'product' | 'trial' | 'paused' | 'expired' | 'upcoming' | 'member' };

export function couponEligibility(state: AppState, memberId: string, productId: string, now: Date): Eligibility {
  const p = state.products.find((x) => x.id === productId);
  const member = findMember(state, memberId);
  if (!member) return { ok: false, code: 'member', reason: '회원 정보를 찾을 수 없어요.' };
  if (!p) return { ok: false, code: 'product', reason: '상품을 찾을 수 없어요.' };
  const b = benefitState(p, now);
  if (b !== 'valid') return { ok: false, code: 'product', reason: `${BENEFIT_LABEL[b]} 상품이라 코드를 받을 수 없어요.` };
  const st = memberStatus(state, member, now);
  switch (st.kind) {
    case 'paid':
      return { ok: true, expiresOn: st.membership.endDate < p.benefitEnd ? st.membership.endDate : p.benefitEnd };
    case 'trial':
      return { ok: false, code: 'trial', reason: '제휴 혜택은 유료 회원권(1개월·3개월)을 이용 중인 회원에게 드려요. 무료체험 기간에는 상품 정보만 볼 수 있어요.' };
    case 'paused':
      return { ok: false, code: 'paused', reason: '회원권 휴회 기간에는 혜택 코드를 받을 수 없어요. 휴회가 끝나면 다시 받을 수 있어요.' };
    case 'upcoming':
      return { ok: false, code: 'upcoming', reason: '회원권 시작일부터 혜택 코드를 받을 수 있어요.' };
    case 'expired':
      return { ok: false, code: 'expired', reason: '회원권이 만료되어 혜택 코드를 받을 수 없어요. 회원권 연장은 온유 담당자에게 문의해 주세요.' };
  }
}

function pushEvent(state: AppState, type: MallEventType, memberId: string, productId: string, now: Date): AppState {
  return { ...state, mallEvents: [...state.mallEvents, { id: uid('ev'), type, memberId, productId, at: now.toISOString() }] };
}

export function validCouponFor(state: AppState, memberId: string, productId: string, now: Date): Coupon | undefined {
  const today = seoulDate(now);
  return state.coupons.find((c) => c.memberId === memberId && c.productId === productId && !c.demoUsedAt && c.expiresOn >= today);
}

/** 같은 회원·같은 유효 혜택이면 기존 코드를 다시 보여준다 (중복 발급 없음). */
export function issueCoupon(state: AppState, gateway: PartnerCouponGateway, memberId: string, productId: string, now: Date): Result<{ coupon: Coupon; reissued: boolean }> {
  const el = couponEligibility(state, memberId, productId, now);
  if (!el.ok) return fail(el.reason);
  const existing = validCouponFor(state, memberId, productId, now);
  if (existing) {
    return ok(pushEvent(state, 'coupon_reshown', memberId, productId, now), { coupon: existing, reissued: true }, '이미 받은 코드가 있어 같은 코드를 다시 보여드려요.');
  }
  let code = gateway.createCode();
  while (state.coupons.some((c) => c.code === code)) code = gateway.createCode();
  const coupon: Coupon = { id: uid('cp'), code, memberId, productId, issuedAt: now.toISOString(), expiresOn: el.expiresOn };
  const next = pushEvent({ ...state, coupons: [...state.coupons, coupon] }, 'coupon_issued', memberId, productId, now);
  return ok(next, { coupon, reissued: false }, '개인 할인코드가 발급됐어요.');
}

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function validateCode(state: AppState, memberId: string, productId: string, code: string, now: Date): { ok: true; coupon: Coupon } | { ok: false; error: string } {
  const c = normalizeCode(code);
  if (!c) return { ok: false, error: '할인코드를 입력해 주세요.' };
  const coupon = state.coupons.find((x) => x.code === c);
  if (!coupon || coupon.memberId !== memberId) return { ok: false, error: '확인되지 않는 코드예요. 철자를 다시 확인해 주세요.' };
  if (coupon.productId !== productId) return { ok: false, error: '이 상품에는 쓸 수 없는 코드예요. 상품별로 코드가 달라요.' };
  if (coupon.demoUsedAt) return { ok: false, error: '이미 사용 처리(시연)된 코드예요.' };
  if (coupon.expiresOn < seoulDate(now)) return { ok: false, error: '유효기간이 지난 코드예요.' };
  const el = couponEligibility(state, memberId, productId, now);
  if (!el.ok) return { ok: false, error: el.reason };
  return { ok: true, coupon };
}

export function recordPurchasePageOpen(state: AppState, memberId: string, productId: string, now: Date): Result {
  if (!state.products.some((p) => p.id === productId)) return fail('상품을 찾을 수 없어요.');
  return ok(pushEvent(state, 'purchase_page_open', memberId, productId, now), undefined);
}

/** 시연 상태: 코드 사용 처리. 실제 결제·매출이 아니다. */
export function markCouponDemoUsed(state: AppState, memberId: string, productId: string, code: string, now: Date): Result {
  const v = validateCode(state, memberId, productId, code, now);
  if (!v.ok) return fail(v.error);
  const coupons = state.coupons.map((c) => (c.id === v.coupon.id ? { ...c, demoUsedAt: now.toISOString() } : c));
  return ok(pushEvent({ ...state, coupons }, 'coupon_demo_used', memberId, productId, now), undefined, '시연용으로 코드 사용 처리를 기록했어요. 실제 결제는 일어나지 않았어요.');
}

export type ProductPatch = Pick<Product, 'listPrice' | 'discountType' | 'discountValue' | 'shippingFee' | 'freeShippingOver' | 'benefitStart' | 'benefitEnd' | 'active'>;

export function updateProduct(state: AppState, managerId: string, productId: string, patch: ProductPatch): Result {
  if (!isStaff(state, managerId, 'manager')) return fail('제휴몰 관리는 매니저만 할 수 있어요.');
  const p = state.products.find((x) => x.id === productId);
  if (!p) return fail('상품을 찾을 수 없어요.');
  const ints = [patch.listPrice, patch.discountValue, patch.shippingFee, patch.freeShippingOver];
  if (ints.some((n) => !Number.isInteger(n) || n < 0)) return fail('금액은 0 이상의 정수(원)로 입력해 주세요.');
  if (patch.listPrice < 100) return fail('판매가를 100원 이상으로 입력해 주세요.');
  if (patch.discountType === 'rate' && (patch.discountValue < 1 || patch.discountValue > 90)) return fail('할인율은 1~90% 사이로 입력해 주세요.');
  if (patch.discountType === 'amount' && (patch.discountValue < 1 || patch.discountValue >= patch.listPrice)) return fail('할인액은 판매가보다 작아야 해요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.benefitStart) || !/^\d{4}-\d{2}-\d{2}$/.test(patch.benefitEnd)) return fail('혜택 기간을 선택해 주세요.');
  if (patch.benefitStart > patch.benefitEnd) return fail('혜택 시작일이 종료일보다 늦어요.');
  const products = state.products.map((x) => (x.id === productId ? { ...x, ...patch } : x));
  return ok({ ...state, products }, undefined, '상품 정보를 저장했어요.');
}

export function mallStats(state: AppState) {
  const by = (t: MallEventType) => state.mallEvents.filter((e) => e.type === t).length;
  return {
    issued: state.coupons.length,
    reshown: by('coupon_reshown'),
    pageOpens: by('purchase_page_open'),
    demoUsed: state.coupons.filter((c) => c.demoUsedAt).length,
  };
}
