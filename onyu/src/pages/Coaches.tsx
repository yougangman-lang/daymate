// 코치 소개. 공개 경로 /coaches(시작 화면에서 진입)와 회원 경로 /member/coaches(회원 홈·예약 화면에서 진입).
import { Link, useLocation, type Location } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { FontToggle, safeInternal, usePublicPage, type BackState } from '../components/PublicPage';
import { PageNav } from '../components/ui';
import { COACH_PHOTO_SIZE, COACH_PROFILES, coachAnchor, coachProfileOf, photoUrl } from '../data/coaches';
import { findStaff, staffName } from '../domain/selectors';
import { useAppState } from '../store/store';

const TITLE = '함께 움직일 온유 코치진';
const DESC = '수업에서 함께할 코치들을 만나보세요.';

function CoachGrid({ highlight }: { highlight?: string }) {
  const state = useAppState();
  return (
    <ul className="coach-grid" aria-label="코치 목록">
      {COACH_PROFILES.map((p, index) => {
        const staff = findStaff(state, p.staffId);
        if (!staff) return null;
        const anchor = coachAnchor(p);
        const nameId = `${anchor}-name`;
        return (
          <li key={p.staffId} id={anchor} className={`coach-card${highlight === anchor ? ' is-target' : ''}`} aria-labelledby={nameId}>
            <img
              src={photoUrl(p)}
              alt={`${staff.name} 코치 프로필`}
              width={COACH_PHOTO_SIZE.width}
              height={COACH_PHOTO_SIZE.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : undefined}
              decoding="async"
            />
            <div className="coach-card-body">
              <h2 id={nameId}>{staff.name}</h2>
              <p className="coach-role">온유 코치</p>
              <p className="coach-qual">자격 기준: {staff.plannedQualification}</p>
              {highlight === anchor && <p className="coach-here">예약 화면에서 선택한 수업 매니저예요</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** /member/coaches — 회원 화면 공통 머리글(글씨 크게·도움 요청)과 하단 탭 안에서 표시 */
export function MemberCoachesPage() {
  const location = useLocation() as Location<BackState | null>;
  const back = safeInternal(location.state?.from) ?? '/member';
  return (
    <div className="stack-lg coaches">
      <PageNav back={back} home="/member" />
      <header className="page-head">
        <h1>{TITLE}</h1>
        <p>{DESC}</p>
      </header>
      <CoachGrid highlight={location.hash.slice(1) || undefined} />
    </div>
  );
}

/** /coaches — 로그인 전에도 볼 수 있는 공개 화면 */
export function PublicCoachesPage() {
  usePublicPage();
  const location = useLocation() as Location<BackState | null>;
  const back = safeInternal(location.state?.from) ?? '/';
  return (
    <main className="onyu-ft coaches coaches-public" id="main" aria-labelledby="coaches-title">
      <header className="onyu-ft-heading">
        <div className="onyu-ft-topbar">
          <PageNav back={back} home="/" />
          <FontToggle />
        </div>
        <BrandLogo to="/" size="md" label="온유 시작 화면으로" />
        <h1 id="coaches-title">{TITLE}</h1>
        <p>{DESC}</p>
      </header>
      <CoachGrid />
    </main>
  );
}

/** 예약 화면의 수업 매니저 이름. 코치 소개가 있는 인물이면 해당 소개로 연결한다. */
export function StaffNameLink({ id }: { id: string }) {
  const state = useAppState();
  const { pathname, search } = useLocation();
  const p = coachProfileOf(id);
  const name = staffName(state, id);
  if (!p) return <>{name}</>;
  return (
    <Link to={`/member/coaches#${coachAnchor(p)}`} state={{ from: pathname + search } satisfies BackState} aria-label={`${name} 소개 보기`}>
      {name}
    </Link>
  );
}
