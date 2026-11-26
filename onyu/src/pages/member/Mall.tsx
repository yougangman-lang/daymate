// 온유 제휴몰: 혜택 상세 → 회원 자격 확인 → 개인별 코드 발급 → 코드 복사 → 제휴사 구매 절차 시연
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState, useNow, useStore } from '../../store/store';
import type { Product } from '../../domain/types';
import { findMember } from '../../domain/selectors';
import { formatDate, formatWon } from '../../lib/time';
import { demoPartnerGateway } from '../../adapters/partner';
import {
  BENEFIT_LABEL, benefitState, CATEGORY_LABEL, couponEligibility, discountLabel, issueCoupon, markCouponDemoUsed, memberPrice, quote,
  recordPurchasePageOpen, shippingLabel, unitDiscount, validateCode, validCouponFor,
} from '../../services/mall';
import { ProductArt } from '../../components/ProductArt';
import { Icon } from '../../components/Icon';
import { DemoTag, Empty, Notice, PageHead, PageNav, useRunner, type Msg } from '../../components/ui';

function PriceBlock({ p }: { p: Product }) {
  return (
    <div className="price">
      <div className="small">
        일반 판매가 <s className="num">{formatWon(p.listPrice)}</s>
      </div>
      <div>
        <span className="small">회원 적용가 </span>
        <strong className="num member-price">{formatWon(memberPrice(p))}</strong>
      </div>
      <div className="small">
        {discountLabel(p)} ({formatWon(unitDiscount(p))} 할인) · {shippingLabel(p)}
      </div>
    </div>
  );
}

function BenefitTag({ p, now }: { p: Product; now: Date }) {
  const b = benefitState(p, now);
  return <span className={`tag ${b === 'valid' ? 'tag-ok' : b === 'inactive' ? 'tag-neutral' : 'tag-danger'}`}>{BENEFIT_LABEL[b]}</span>;
}

export function MallPage() {
  const state = useAppState();
  const now = useNow();
  const member = findMember(state, state.demo.memberId)!;
  const [cat, setCat] = useState<'all' | Product['category']>('all');
  const el = couponEligibility(state, member.id, state.products.find((p) => benefitState(p, now) === 'valid')?.id ?? '', now);
  const products = state.products.filter((p) => cat === 'all' || p.category === cat);
  return (
    <div className="stack-lg">
      <PageHead
        title="온유 제휴몰"
        desc="온유가 제휴 기업과 협의한 프로틴·식음료 구매 혜택이에요. 판매·결제·배송은 제휴사가 맡아요."
      />
      <div className="row">
        <DemoTag>상품·가격·제휴 조건 모두 시연 정보</DemoTag>
      </div>
      {el.ok ? (
        <Notice msg={{ kind: 'ok', text: '유료 회원이라 개인 할인코드를 받을 수 있어요.' }} />
      ) : (
        <Notice msg={{ kind: 'info', title: '지금은 할인코드를 받을 수 없어요', text: el.reason }} />
      )}
      <p className="small muted">이 화면의 상품은 측정 결과와 관계없이 모든 회원에게 똑같이 보여요.</p>
      <div className="chips" role="group" aria-label="상품 분류">
        {(['all', 'protein', 'snack', 'drink'] as const).map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? '전체' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        상품 {products.length}개
      </p>
      <ul className="product-grid">
        {products.map((p) => (
          <li key={p.id} className="panel product-card">
            <ProductArt product={p} size={96} />
            <div className="stack-sm">
              <div className="row">
                <span className="tag tag-neutral">{CATEGORY_LABEL[p.category]}</span>
                <BenefitTag p={p} now={now} />
              </div>
              <h2 className="product-name">{p.name}</h2>
              <p className="small muted">
                {p.seller} · {p.volume}
              </p>
              <PriceBlock p={p} />
              <p className="small">
                혜택 기간 {formatDate(p.benefitStart)} ~ {formatDate(p.benefitEnd)}
              </p>
              <Link className="btn btn-primary" to={`/member/mall/${p.id}`} aria-label={`${p.name} 할인코드 받기`}>
                <Icon name="gift" size={20} /> 할인코드 받기
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CopyCode({ code }: { code: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unsupported');
      await navigator.clipboard.writeText(code);
      setMsg({ kind: 'ok', text: '코드를 복사했어요. 구매 화면에서 붙여 넣으세요.' });
    } catch {
      ref.current?.focus();
      ref.current?.select();
      setMsg({ kind: 'warn', text: '자동 복사가 되지 않았어요. 코드가 선택되어 있으니 길게 눌러 복사하거나, 코드를 직접 적어 주세요.' });
    }
  };
  return (
    <div className="stack-sm">
      <label className="strong" htmlFor="coupon-code">
        내 할인코드
      </label>
      <div className="code-row">
        <input id="coupon-code" ref={ref} className="input code" readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-secondary" onClick={copy}>
          <Icon name="copy" size={20} /> 코드 복사
        </button>
      </div>
      <Notice msg={msg} />
    </div>
  );
}

export function ProductPage() {
  const { productId = '' } = useParams();
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const navigate = useNavigate();
  const member = findMember(state, state.demo.memberId)!;
  const p = state.products.find((x) => x.id === productId);
  const { run, msg } = useRunner();
  if (!p) {
    return (
      <div className="stack">
        <PageNav back="/member/mall" home="/member" />
        <Empty title="상품을 찾을 수 없어요" />
      </div>
    );
  }
  const el = couponEligibility(state, member.id, p.id, now);
  const coupon = validCouponFor(state, member.id, p.id, now);
  const used = state.coupons.find((c) => c.memberId === member.id && c.productId === p.id && c.demoUsedAt);

  const openPurchase = () => {
    const r = store.run((s, n) => recordPurchasePageOpen(s, member.id, p.id, n));
    if (r.ok) navigate(`/member/mall/${p.id}/purchase`);
  };

  return (
    <div className="stack-lg">
      <PageNav back="/member/mall" home="/member" />
      <div className="product-hero">
        <ProductArt product={p} size={140} />
        <div className="stack-sm">
          <div className="row">
            <span className="tag tag-neutral">{CATEGORY_LABEL[p.category]}</span>
            <BenefitTag p={p} now={now} />
            <DemoTag>시연 정보</DemoTag>
          </div>
          <h1>{p.name}</h1>
          <p className="muted">
            판매사 {p.seller} · {p.volume}
          </p>
        </div>
      </div>

      <ol className="flow">
        <li className="panel stack">
          <h2>1. 혜택 내용</h2>
          <PriceBlock p={p} />
          <dl className="kv small">
            <dt>혜택 기간</dt>
            <dd>
              {formatDate(p.benefitStart)} ~ {formatDate(p.benefitEnd)}
            </dd>
            <dt>성분</dt>
            <dd>{p.ingredients}</dd>
            <dt>알레르기</dt>
            <dd>{p.allergens}</dd>
            <dt>가격 기준</dt>
            <dd>정수 원 단위, 정률 할인은 10원 미만 버림</dd>
          </dl>
        </li>
        <li className="panel stack">
          <h2>2. 회원 자격 확인</h2>
          {el.ok ? (
            <Notice msg={{ kind: 'ok', text: `유료 회원 혜택 대상이에요. 코드는 ${formatDate(el.expiresOn)}까지 쓸 수 있어요.` }} />
          ) : (
            <Notice msg={{ kind: 'warn', title: '혜택 대상이 아니에요', text: el.reason }} />
          )}
        </li>
        <li className="panel stack">
          <h2>3. 개인 할인코드 발급</h2>
          {coupon ? (
            <p>이미 받은 코드가 있어요. 다시 눌러도 같은 코드를 보여드려요.</p>
          ) : used ? (
            <p className="small">이 상품 코드는 시연에서 사용 처리됐어요.</p>
          ) : (
            <p className="small">회원 한 분께 상품마다 코드 하나를 드려요.</p>
          )}
          <button type="button" className="btn btn-primary" disabled={!el.ok} onClick={() => run((s, n) => issueCoupon(s, demoPartnerGateway, member.id, p.id, n), '할인코드')}>
            <Icon name="gift" size={20} /> {coupon ? '내 코드 다시 보기' : '할인코드 받기'}
          </button>
          <Notice msg={msg} />
        </li>
        <li className="panel stack">
          <h2>4. 코드 복사</h2>
          {coupon ? (
            <>
              <CopyCode code={coupon.code} />
              <p className="small muted">유효기간 {formatDate(coupon.expiresOn)}까지 · 이 상품에만 사용</p>
            </>
          ) : (
            <p className="small muted">코드를 받으면 여기에 표시돼요.</p>
          )}
        </li>
        <li className="panel stack">
          <h2>5. 제휴사 구매 절차 확인</h2>
          <p className="small">실제 운영에서는 제휴사 판매 화면에서 코드를 넣어 구매해요. 시제품에서는 실제 판매 페이지로 이동하지 않고, 구매 절차를 보여주는 시연 화면을 열어요.</p>
          <button type="button" className="btn btn-secondary" onClick={openPurchase} disabled={benefitState(p, now) === 'inactive'}>
            구매 절차 시연 열기
          </button>
        </li>
      </ol>
    </div>
  );
}

export function PurchaseDemo() {
  const { productId = '' } = useParams();
  const state = useAppState();
  const now = useNow();
  const member = findMember(state, state.demo.memberId)!;
  const p = state.products.find((x) => x.id === productId);
  const [qty, setQty] = useState(1);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<Msg>(null);
  const { run, msg } = useRunner();
  if (!p) return <Empty title="상품을 찾을 수 없어요" />;
  const mine = validCouponFor(state, member.id, p.id, now);
  const appliedOk = applied ? validateCode(state, member.id, p.id, applied, now).ok : false;
  const q = quote(p, qty, appliedOk);

  const apply = () => {
    const v = validateCode(state, member.id, p.id, code, now);
    if (v.ok) {
      setApplied(v.coupon.code);
      setCodeMsg({ kind: 'ok', text: `코드가 적용됐어요. 개당 ${formatWon(unitDiscount(p))} 할인돼요.` });
    } else {
      setApplied(null);
      setCodeMsg({ kind: 'error', text: v.error });
    }
  };

  return (
    <div className="stack-lg">
      <PageNav back={`/member/mall/${p.id}`} home="/member" />
      <div className="demo-banner" role="note">
        <strong>구매 절차 시연 화면</strong>
        <span>실제 제휴사 판매 페이지가 아니에요. 결제·카드 정보 입력·배송은 하지 않아요.</span>
      </div>
      <PageHead title="제휴사 구매 절차 (시연)" desc={`${p.seller} · ${p.name}`} />
      <section className="panel stack">
        <div className="field">
          <span className="label" id="qty-label">
            수량
          </span>
          <div className="stepper" role="group" aria-labelledby="qty-label">
            <button type="button" className="btn btn-secondary" onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="수량 줄이기">
              −
            </button>
            <output className="num" aria-live="polite">
              {q.qty}개
            </output>
            <button type="button" className="btn btn-secondary" onClick={() => setQty((x) => Math.min(10, x + 1))} aria-label="수량 늘리기">
              +
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="code-input">할인코드</label>
          <div className="code-row">
            <input id="code-input" className="input code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ONYU-XXXX-XXXX" autoComplete="off" aria-invalid={codeMsg?.kind === 'error'} />
            <button type="button" className="btn btn-primary" onClick={apply}>
              적용
            </button>
          </div>
          {mine && (
            <button type="button" className="link-btn" onClick={() => setCode(mine.code)}>
              내가 받은 코드 넣기
            </button>
          )}
          <Notice msg={codeMsg} />
        </div>
      </section>
      <section className="panel stack" aria-labelledby="sum-h">
        <h2 id="sum-h">결제 예정 금액 확인 (시연)</h2>
        <dl className="sum">
          <dt>일반 판매가 × {q.qty}</dt>
          <dd className="num">{formatWon(q.listSubtotal)}</dd>
          <dt>회원 할인</dt>
          <dd className="num">{q.discount ? `− ${formatWon(q.discount)}` : '적용 안 됨'}</dd>
          <dt>상품 금액</dt>
          <dd className="num">{formatWon(q.subtotal)}</dd>
          <dt>배송비</dt>
          <dd className="num">{q.shipping ? formatWon(q.shipping) : '무료'}</dd>
          <dt className="total">최종 금액</dt>
          <dd className="num total">{formatWon(q.total)}</dd>
        </dl>
        <p className="small muted">{shippingLabel(p)}. 무료배송 기준은 할인 후 상품 금액으로 판단해요.</p>
        <button type="button" className="btn btn-secondary" disabled={!appliedOk} onClick={() => applied && run((s, n) => markCouponDemoUsed(s, member.id, p.id, applied, n))}>
          시연: 코드 사용 처리하기
        </button>
        <p className="small muted">결제 버튼은 없어요. 사용 처리는 시연 상태로만 기록되며 실제 매출·정산이 아니에요.</p>
        <Notice msg={msg} />
      </section>
    </div>
  );
}
