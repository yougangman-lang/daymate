import type { CategoryId } from '../lib/types';

export interface ConditionField {
  key: string;
  label: string;
  kind: 'single' | 'multi';
  options: string[];
  /**
   * required: 그룹과 참여자의 값이 맞아야 추천 대상이 된다.
   * preference: 비교 정보로만 보여준다.
   */
  match: 'required' | 'preference';
  /** 이 값을 고르면 어떤 값과도 맞는 것으로 본다 */
  anyValue?: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
  tagline: string;
  /** 일정·예약 정보에 대한 주의 문구 */
  scheduleNote: string;
  fields: ConditionField[];
}

const ANY = '상관없음';

export const CATEGORIES: Category[] = [
  {
    id: 'baseball',
    label: '야구 직관',
    short: '야구',
    tagline: '응원 스타일이 맞는 사람과 같이 직관해요',
    scheduleNote: '경기 일정·좌석은 실제 확인 전 예시예요. 예매는 각자 공식 판매처에서 진행해요.',
    fields: [
      {
        key: 'team',
        label: '응원팀',
        kind: 'single',
        options: ['서울 연고팀', '인천 연고팀', '수원 연고팀', '부산 연고팀', '대구 연고팀', '광주 연고팀', '팀 무관'],
        match: 'required',
        anyValue: '팀 무관',
      },
      { key: 'experience', label: '직관 경험', kind: 'single', options: ['처음이에요', '몇 번 가봤어요', '자주 가요'], match: 'preference' },
      {
        key: 'cheer',
        label: '응원 방식',
        kind: 'single',
        options: ['응원가 열창', '적당히 박수', '조용히 관람', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'seatBudget', label: '좌석 예산', kind: 'single', options: ['2만 원 이하', '2~4만 원', '4만 원 이상'], match: 'preference' },
    ],
  },
  {
    id: 'soccer',
    label: '축구 직관',
    short: '축구',
    tagline: '90분 동안 같은 리듬으로 응원할 동행',
    scheduleNote: '경기 일정은 실제 확인 전 예시예요. 공식 구단 서비스와 무관해요.',
    fields: [
      {
        key: 'team',
        label: '응원팀',
        kind: 'single',
        options: ['서울 연고팀', '수원 연고팀', '인천 연고팀', '전북 연고팀', '울산 연고팀', '팀 무관'],
        match: 'required',
        anyValue: '팀 무관',
      },
      { key: 'experience', label: '직관 경험', kind: 'single', options: ['처음이에요', '몇 번 가봤어요', '자주 가요'], match: 'preference' },
      {
        key: 'cheer',
        label: '응원 방식',
        kind: 'single',
        options: ['서포터석 응원', '일반석 관람', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'seatBudget', label: '좌석 예산', kind: 'single', options: ['2만 원 이하', '2~4만 원', '4만 원 이상'], match: 'preference' },
    ],
  },
  {
    id: 'shopping',
    label: '쇼핑·팝업스토어',
    short: '쇼핑',
    tagline: '구경 템포가 비슷한 쇼핑 메이트',
    scheduleNote: '팝업스토어 운영 기간은 방문 전 각 브랜드 공지로 확인해야 해요.',
    fields: [
      { key: 'items', label: '관심 품목', kind: 'multi', options: ['패션', '소품·리빙', '뷰티', '캐릭터 굿즈', '빈티지'], match: 'required' },
      {
        key: 'purpose',
        label: '구매·구경 목적',
        kind: 'single',
        options: ['살 것 정하고 구매', '구경 위주', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'pace', label: '이동 속도', kind: 'single', options: ['빠르게 여러 곳', '보통', '한 곳 오래'], match: 'preference' },
      {
        key: 'photo',
        label: '사진 촬영 선호',
        kind: 'single',
        options: ['인증샷 많이', '가끔', '거의 안 찍어요', ANY],
        match: 'required',
        anyValue: ANY,
      },
    ],
  },
  {
    id: 'exhibition',
    label: '전시·미술관',
    short: '전시',
    tagline: '감상 속도가 맞는 전시 메이트',
    scheduleNote: '전시 기간과 예약 여부는 각 기관 공지로 확인해야 해요.',
    fields: [
      {
        key: 'viewPace',
        label: '감상 속도',
        kind: 'single',
        options: ['천천히 오래', '보통', '핵심만 빠르게'],
        match: 'required',
      },
      {
        key: 'talk',
        label: '대화 선호',
        kind: 'single',
        options: ['관람 중엔 조용히', '관람 후 이야기', '보면서 이야기', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'after', label: '관람 후 일정', kind: 'single', options: ['바로 해산', '카페 30분', '식사까지'], match: 'preference' },
    ],
  },
  {
    id: 'performance',
    label: '공연·페스티벌',
    short: '공연',
    tagline: '같은 무대를 같은 텐션으로',
    scheduleNote: '공연 일정·티켓은 실제 확인 전 예시예요. 예매는 각자 공식 판매처에서 진행해요.',
    fields: [
      { key: 'genre', label: '장르', kind: 'multi', options: ['밴드', '힙합', '발라드·인디', '뮤지컬', '클래식'], match: 'required' },
      {
        key: 'zone',
        label: '관람 구역',
        kind: 'single',
        options: ['스탠딩', '좌석', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'after', label: '공연 후', kind: 'single', options: ['바로 해산', '간단히 식사'], match: 'preference' },
    ],
  },
  {
    id: 'movie',
    label: '영화',
    short: '영화',
    tagline: '보고 나서 이야기 나눌 사람',
    scheduleNote: '상영 시간표는 예시예요. 예매는 각자 진행해요.',
    fields: [
      { key: 'genre', label: '장르', kind: 'multi', options: ['액션', '로맨스', '공포·스릴러', '애니메이션', '독립영화'], match: 'required' },
      {
        key: 'afterTalk',
        label: '관람 후',
        kind: 'single',
        options: ['바로 해산', '짧게 감상 나누기', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'seat', label: '좌석 선호', kind: 'single', options: ['앞쪽', '가운데', '뒤쪽'], match: 'preference' },
    ],
  },
  {
    id: 'food',
    label: '맛집·카페',
    short: '맛집',
    tagline: '혼자 가기 애매한 웨이팅 맛집',
    scheduleNote: '영업시간·웨이팅은 방문 당일 매장 공지로 확인해야 해요.',
    fields: [
      { key: 'menu', label: '메뉴', kind: 'multi', options: ['한식', '양식', '일식', '중식', '디저트·카페'], match: 'required' },
      {
        key: 'area',
        label: '방문 지역',
        kind: 'single',
        options: ['성수·건대', '홍대·연남', '강남·신사', '종로·을지로', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'costRange', label: '예상 비용', kind: 'single', options: ['1만 원대', '2만 원대', '3만 원 이상'], match: 'preference' },
    ],
  },
  {
    id: 'picnic',
    label: '산책·피크닉',
    short: '산책',
    tagline: '가볍게 걷고 쉬어가는 하루',
    scheduleNote: '날씨에 따라 일정이 바뀔 수 있어요.',
    fields: [
      {
        key: 'spot',
        label: '장소 유형',
        kind: 'single',
        options: ['한강', '도심 공원', '숲길·둘레길', ANY],
        match: 'required',
        anyValue: ANY,
      },
      { key: 'walk', label: '걷는 양', kind: 'single', options: ['30분 이내', '1시간 정도', '2시간 이상'], match: 'preference' },
      { key: 'prep', label: '준비물', kind: 'single', options: ['각자 준비', '나눠서 준비', '현장 구매'], match: 'preference' },
    ],
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export function getCategory(id: CategoryId): Category {
  return CATEGORY_MAP[id];
}
