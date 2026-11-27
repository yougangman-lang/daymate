// 코치 소개 사진. 이름·자격은 기존 직원 데이터(STAFF)에서 읽고 여기서는 사진만 연결한다(같은 인물 중복 생성 금지).
export interface CoachProfile {
  /** 기존 직원 ID (예약·담당 수업 데이터의 managerId와 동일) */
  staffId: string;
  /** 화면 내 위치(#coach-…)와 사진 파일 이름 */
  slug: string;
  /** 브라우저 이미지 주소 (/images/coaches/파일명.png) */
  photo: string;
}

/** 원본 사진 크기 — 로딩 전에 자리를 미리 잡아 화면이 밀리지 않게 한다 */
export const COACH_PHOTO_SIZE = { width: 1086, height: 1448 } as const;

/** 표시 순서: 이현석 → 정연태 → 변지원 → 기윤재 */
export const COACH_PROFILES: CoachProfile[] = [
  { staffId: 'm1', slug: 'lee-hyeonseok', photo: '/images/coaches/lee-hyeonseok.png' },
  { staffId: 'm2', slug: 'jeong-yeontae', photo: '/images/coaches/jeong-yeontae.png' },
  { staffId: 'm3', slug: 'byun-jiwon', photo: '/images/coaches/byun-jiwon.png' },
  { staffId: 'm4', slug: 'gi-yunjae', photo: '/images/coaches/gi-yunjae.png' },
];

export function coachProfileOf(staffId: string | undefined): CoachProfile | undefined {
  return COACH_PROFILES.find((p) => p.staffId === staffId);
}

export const coachAnchor = (p: CoachProfile) => `coach-${p.slug}`;

/** 하위 경로 배포(VITE_BASE)에서도 동작하도록 기준 경로를 붙인다. 기본값에서는 /images/coaches/… 그대로다. */
export function photoUrl(p: CoachProfile): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + p.photo;
}
