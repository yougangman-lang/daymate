// 시제품용 워드마크 (공식 로고 아님). 정식 로고 파일이 생기면 이 컴포넌트만 교체하면 된다.
import { Link } from 'react-router-dom';

interface Props {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  showSub?: boolean;
  label?: string;
}

function Mark({ showSub }: { showSub: boolean }) {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        온<span className="colon">:</span>
        <span className="hanja">遊</span>
      </span>
      {showSub && (
        <span className="brand-sub" aria-hidden="true">
          <span className="ko">온유</span>
          <span className="en">ON YOU</span>
        </span>
      )}
    </>
  );
}

export function BrandLogo({ to, size = 'md', showSub = true, label }: Props) {
  const cls = `brand brand-${size}`;
  if (!to) {
    return (
      <span className={cls} role="img" aria-label="온:遊 온유 ON YOU">
        <Mark showSub={showSub} />
      </span>
    );
  }
  return (
    <Link to={to} className={cls} aria-label={label ?? '온유 홈으로'}>
      <Mark showSub={showSub} />
    </Link>
  );
}
