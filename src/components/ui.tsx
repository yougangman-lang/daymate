import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Person } from '../lib/types';
import { ME } from '../lib/types';

export function Avatar({ person, size = 40 }: { person: Pick<Person, 'nickname' | 'avatarHue' | 'id'>; size?: number }) {
  const initial = person.nickname.slice(0, 1) || '?';
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${person.avatarHue} 80% 70%), hsl(${(person.avatarHue + 40) % 360} 75% 55%))`,
      }}
    >
      {person.id === ME ? '나' : initial}
    </span>
  );
}

/** 인증 상태 표시. 예시 데이터는 예시임을, 체험 완료는 실제 인증이 아님을 분명히 한다. */
export function VerificationTag({ person }: { person: Pick<Person, 'verification' | 'id'> }) {
  if (person.id === ME) return <span className="tag tag-muted">내 프로필</span>;
  if (person.verification === 'example') return <span className="tag tag-muted">학교 메일 확인(예시 데이터)</span>;
  return <span className="tag tag-muted">미인증</span>;
}

export function PageHeader({ eyebrow, title, desc, action }: { eyebrow?: string; title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="44" height="44">
          <circle cx="18" cy="24" r="10" fill="currentColor" opacity="0.25" />
          <circle cx="30" cy="24" r="10" fill="currentColor" opacity="0.45" />
        </svg>
      </div>
      <h2>{title}</h2>
      {children && <div className="empty-body">{children}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="demo-note" role="note">
      <span className="demo-pill">시제품</span>
      <span>{children}</span>
    </p>
  );
}

export function ScorePill({ score }: { score: number }) {
  return (
    <span className="score-pill" aria-label={`성향 근접도 ${score}/100`}>
      성향 근접도 <strong>{score}</strong>/100
    </span>
  );
}

export function NeedTest({ to = '/start' }: { to?: string }) {
  return (
    <EmptyState title="먼저 동행 선호 프로필을 만들어 주세요" action={<Link className="btn btn-primary" to={to}>취향 확인 시작</Link>}>
      <p>관심 활동·가능한 날짜·예산과 5문항 테스트를 마치면 추천과 역매칭을 사용할 수 있어요.</p>
    </EmptyState>
  );
}

export function Icon({ name, size = 20 }: { name: 'home' | 'search' | 'spark' | 'users' | 'shield' | 'heart' | 'heart-fill' | 'flag' | 'ban' | 'plus' | 'mail' | 'back' | 'check' | 'clock' | 'pin' | 'won'; size?: number }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    home: <path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    search: <g {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></g>,
    spark: <path {...p} d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />,
    users: <g {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5a5 5 0 0 1 4.5 5" /></g>,
    shield: <path {...p} d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />,
    heart: <path {...p} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    'heart-fill': <path fill="currentColor" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    flag: <path {...p} d="M5 21V4m0 0h11l-2 4 2 4H5" />,
    ban: <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></g>,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    mail: <g {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></g>,
    back: <path {...p} d="M15 5l-7 7 7 7" />,
    check: <path {...p} d="M5 12l5 5 9-10" />,
    clock: <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></g>,
    pin: <g {...p}><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></g>,
    won: <g {...p}><path d="M4 6l3.5 12L12 8l4.5 10L20 6" /><path d="M3 11h18" /></g>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
