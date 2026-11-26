import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppState, Result } from '../domain/types';
import { useStore } from '../store/store';
import { Icon } from './Icon';

export type Msg = { kind: 'ok' | 'error' | 'warn' | 'info'; title?: string; text: string } | null;

export function Notice({ msg, children }: { msg?: Msg; children?: ReactNode }) {
  if (!msg && !children) return null;
  const kind = msg?.kind ?? 'info';
  const icon = kind === 'ok' ? 'check' : kind === 'error' ? 'alert' : kind === 'warn' ? 'alert' : 'info';
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} />
      <div>
        {msg?.title && <strong>{msg.title}</strong>}
        {msg?.text && <span>{msg.text}</span>}
        {children}
      </div>
    </div>
  );
}

/** 서비스 실행 + 결과 메시지 상태. 저장에 실패하면 성공 메시지를 띄우지 않는다. */
export function useRunner() {
  const store = useStore();
  const [msg, setMsg] = useState<Msg>(null);
  const run = useCallback(
    <T,>(fn: (s: AppState, now: Date) => Result<T>, okTitle?: string): Result<T> => {
      const r = store.run(fn);
      if (r.ok) setMsg(r.message ? { kind: 'ok', title: okTitle, text: r.message } : null);
      else setMsg({ kind: 'error', title: '처리하지 못했어요', text: r.error });
      return r;
    },
    [store],
  );
  return { run, msg, setMsg };
}

/** 이전으로 / 처음으로 – 모든 하위 화면 같은 위치 */
export function PageNav({ back, home }: { back?: string; home: string }) {
  const navigate = useNavigate();
  return (
    <nav className="page-nav no-print" aria-label="화면 이동">
      <button type="button" className="btn btn-ghost" onClick={() => (back ? navigate(back) : navigate(-1))}>
        <Icon name="back" size={20} /> 이전으로
      </button>
      <Link className="btn btn-ghost" to={home}>
        <Icon name="start" size={20} /> 처음으로
      </Link>
    </nav>
  );
}

export function PageHead({ title, desc, eyebrow }: { title: string; desc?: ReactNode; eyebrow?: string }) {
  return (
    <header className="page-head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {desc && <p>{desc}</p>}
    </header>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 접근성 모달: Esc·닫기 버튼으로 닫기, 포커스 가두기, 닫힌 뒤 원래 위치로 포커스 복귀 */
export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      restore?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="stack">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onClose} data-autofocus>
            아니요, 돌아갈게요
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div>{body}</div>
    </Modal>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel-soft stack-sm">
      <strong>{title}</strong>
      {children && <div className="muted small">{children}</div>}
    </div>
  );
}

export function DemoTag({ children = '시연 데이터' }: { children?: ReactNode }) {
  return <span className="tag tag-demo">{children}</span>;
}
