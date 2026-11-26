import { useState } from 'react';
import { useAppState, useNow } from '../../store/store';
import type { Product } from '../../domain/types';
import { displayName, findMember } from '../../domain/selectors';
import { formatDate, formatDateTime, formatWon, seoulDate } from '../../lib/time';
import { BENEFIT_LABEL, benefitState, CATEGORY_LABEL, mallStats, memberPrice, updateProduct, type ProductPatch } from '../../services/mall';
import { Notice, useRunner } from '../../components/ui';

export function MallAdmin() {
  const state = useAppState();
  const now = useNow();
  const st = mallStats(state);
  const [editing, setEditing] = useState<string | null>(null);
  const today = seoulDate(now);
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">제휴몰 관리</span>
        <h1>제휴 혜택과 할인코드</h1>
        <p>판매·결제·배송은 제휴사가 맡는 구조예요. 아래 숫자는 앱 안 행동 기록이며 실제 제휴 매출·정산이 아니에요.</p>
      </header>
      <ul className="ops-grid">
        <li className="ops-card static">
          <span className="l">코드 발급</span>
          <span className="v num">{st.issued}건</span>
          <span className="s">회원·상품별 1개</span>
        </li>
        <li className="ops-card static">
          <span className="l">같은 코드 다시 보기</span>
          <span className="v num">{st.reshown}회</span>
          <span className="s">중복 발급 대신 재표시</span>
        </li>
        <li className="ops-card static">
          <span className="l">구매 페이지 이동</span>
          <span className="v num">{st.pageOpens}회</span>
          <span className="s">구매 절차 시연 열기</span>
        </li>
        <li className="ops-card static">
          <span className="l">코드 사용 (시연 상태)</span>
          <span className="v num">{st.demoUsed}건</span>
          <span className="s">실제 결제 아님</span>
        </li>
      </ul>

      <section className="stack" aria-labelledby="prod-h">
        <h2 id="prod-h">상품 {state.products.length}개 (시연 정보)</h2>
        <ul className="stack" style={{ listStyle: 'none' }}>
          {state.products.map((p) => (
            <li key={p.id} className="panel stack-sm">
              <div className="row between">
                <strong>
                  {p.name} <span className="small muted">· {p.seller} · {CATEGORY_LABEL[p.category]}</span>
                </strong>
                <span className={`tag ${benefitState(p, now) === 'valid' ? 'tag-ok' : 'tag-neutral'}`}>{BENEFIT_LABEL[benefitState(p, now)]}</span>
              </div>
              <span className="small">
                일반 {formatWon(p.listPrice)} → 회원 {formatWon(memberPrice(p))} ({p.discountType === 'rate' ? `${p.discountValue}%` : formatWon(p.discountValue)}) · 배송비 {formatWon(p.shippingFee)}
                {p.freeShippingOver ? ` (${formatWon(p.freeShippingOver)} 이상 무료)` : ''} · {formatDate(p.benefitStart)} ~ {formatDate(p.benefitEnd)}
              </span>
              {editing === p.id ? (
                <ProductEditor p={p} onClose={() => setEditing(null)} />
              ) : (
                <div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(p.id)}>
                    가격·조건 편집
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="stack" aria-labelledby="cp-h">
        <h2 id="cp-h">발급된 할인코드</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>코드</th>
                <th>회원</th>
                <th>상품</th>
                <th>발급</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {state.coupons.map((c) => (
                <tr key={c.id}>
                  <td className="code">{c.code}</td>
                  <td>{displayName(findMember(state, c.memberId))}</td>
                  <td className="small">{state.products.find((p) => p.id === c.productId)?.name}</td>
                  <td className="small">{formatDateTime(c.issuedAt)}</td>
                  <td className="small">{c.demoUsedAt ? '시연 사용 처리' : c.expiresOn < today ? '만료' : `유효 (${formatDate(c.expiresOn)}까지)`}</td>
                </tr>
              ))}
              {state.coupons.length === 0 && (
                <tr>
                  <td colSpan={5}>발급된 코드가 없어요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProductEditor({ p, onClose }: { p: Product; onClose: () => void }) {
  const state = useAppState();
  const [f, setF] = useState<ProductPatch>({
    listPrice: p.listPrice,
    discountType: p.discountType,
    discountValue: p.discountValue,
    shippingFee: p.shippingFee,
    freeShippingOver: p.freeShippingOver,
    benefitStart: p.benefitStart,
    benefitEnd: p.benefitEnd,
    active: p.active,
  });
  const { run, msg } = useRunner();
  const num = (k: keyof ProductPatch) => (e: React.ChangeEvent<HTMLInputElement>) => setF((o) => ({ ...o, [k]: e.target.value === '' ? NaN : Number(e.target.value) }));
  const id = `pe-${p.id}`;
  return (
    <form
      className="panel-soft stack"
      onSubmit={(e) => {
        e.preventDefault();
        run((s) => updateProduct(s, state.demo.managerId, p.id, f));
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-lp`}>일반 판매가 (원)</label>
          <input id={`${id}-lp`} className="input" type="number" inputMode="numeric" value={Number.isNaN(f.listPrice) ? '' : f.listPrice} onChange={num('listPrice')} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-dt`}>할인 방식</label>
          <select id={`${id}-dt`} className="select" value={f.discountType} onChange={(e) => setF((o) => ({ ...o, discountType: e.target.value as 'rate' | 'amount' }))}>
            <option value="rate">정률 (%)</option>
            <option value="amount">정액 (원)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-dv`}>{f.discountType === 'rate' ? '할인율 (%)' : '할인액 (원)'}</label>
          <input id={`${id}-dv`} className="input" type="number" inputMode="numeric" value={Number.isNaN(f.discountValue) ? '' : f.discountValue} onChange={num('discountValue')} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-sf`}>배송비 (원)</label>
          <input id={`${id}-sf`} className="input" type="number" inputMode="numeric" value={Number.isNaN(f.shippingFee) ? '' : f.shippingFee} onChange={num('shippingFee')} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-fo`}>무료배송 기준 (원, 0=없음)</label>
          <input id={`${id}-fo`} className="input" type="number" inputMode="numeric" value={Number.isNaN(f.freeShippingOver) ? '' : f.freeShippingOver} onChange={num('freeShippingOver')} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-bs`}>혜택 시작</label>
          <input id={`${id}-bs`} className="input" type="date" value={f.benefitStart} onChange={(e) => setF((o) => ({ ...o, benefitStart: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-be`}>혜택 종료</label>
          <input id={`${id}-be`} className="input" type="date" value={f.benefitEnd} onChange={(e) => setF((o) => ({ ...o, benefitEnd: e.target.value }))} />
        </div>
        <label className="choice">
          <input type="checkbox" checked={f.active} onChange={(e) => setF((o) => ({ ...o, active: e.target.checked }))} />
          <span className="check" aria-hidden="true">
            {f.active ? '✓' : ''}
          </span>
          <span>
            판매 활성
            <span className="sub">{f.active ? '회원에게 혜택 노출' : '판매 중지 (코드 발급 불가)'}</span>
          </span>
        </label>
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
        <button type="submit" className="btn btn-primary">
          저장
        </button>
      </div>
      <Notice msg={msg} />
    </form>
  );
}
