/**
 * 시제품용 예시 데이터.
 * 모든 이름·학교·프로필·일정은 허구이며 실제 인물·단체·경기·전시 일정과 무관하다.
 * 날짜는 접속한 날을 기준으로 상대적으로 생성한다.
 */
import { addDays } from '../lib/date';
import type { Group, Person, Traits } from '../lib/types';

export interface School {
  id: string;
  name: string;
  /** 시제품 전용 가상 도메인 (.example 은 예약된 테스트용 최상위 도메인) */
  domain: string;
}

export const SCHOOLS: School[] = [
  { id: 'hanbit', name: '한빛대학교(가상)', domain: 'hanbit.ac.example' },
  { id: 'nuri', name: '누리대학교(가상)', domain: 'nuri.ac.example' },
  { id: 'saesol', name: '새솔대학교(가상)', domain: 'saesol.ac.example' },
  { id: 'daon', name: '다온대학교(가상)', domain: 'daon.ac.example' },
  { id: 'byeolbit', name: '별빛대학교(가상)', domain: 'byeolbit.ac.example' },
];

interface PersonSeed extends Omit<Person, 'dates'> {
  dayOffsets: number[];
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const PEOPLE_SEED: PersonSeed[] = [
  {
    id: 'p01', nickname: '하늘콩', ageRange: '20대 초반', schoolName: '한빛대학교(가상)', verification: 'example',
    bio: '퇴근길 야구 직관이 낙이에요. 응원은 적당히, 치킨은 진심.',
    interests: ['baseball', 'food'], dayOffsets: range(1, 14), timeSlots: ['afternoon', 'evening'], budgetMax: 50000,
    conditions: { baseball: { team: '서울 연고팀', experience: '자주 가요', cheer: '적당히 박수', seatBudget: '2~4만 원' } },
    traits: [0, 50, 50, 50, 50], reverseOptIn: true, avatarHue: 210,
  },
  {
    id: 'p02', nickname: '민트초코', ageRange: '20대 중반', schoolName: '누리대학교(가상)', verification: 'example',
    bio: '전시 보고 근처 카페에서 이야기 나누는 걸 좋아해요.',
    interests: ['exhibition', 'shopping'], dayOffsets: range(1, 14), timeSlots: ['morning', 'afternoon'], budgetMax: 40000,
    conditions: { exhibition: { viewPace: '천천히 오래', talk: '관람 후 이야기', after: '카페 30분' } },
    traits: [0, 50, 0, 50, 0], reverseOptIn: true, avatarHue: 160,
  },
  {
    id: 'p03', nickname: '주말산책러', ageRange: '20대 초반', schoolName: '새솔대학교(가상)', verification: 'none',
    bio: '한강 돗자리와 편의점 라면 조합을 사랑합니다.',
    interests: ['picnic', 'exhibition', 'movie'], dayOffsets: range(1, 14), timeSlots: ['morning', 'afternoon', 'evening'], budgetMax: 20000,
    conditions: {
      picnic: { spot: '한강', walk: '1시간 정도', prep: '나눠서 준비' },
      exhibition: { viewPace: '천천히 오래', talk: '상관없음', after: '식사까지' },
    },
    traits: [100, 100, 0, 0, 0], reverseOptIn: true, avatarHue: 120,
  },
  {
    id: 'p04', nickname: '응원단장', ageRange: '20대 중반', schoolName: '다온대학교(가상)', verification: 'example',
    bio: '서포터석에서 90분 내내 서 있는 타입. 처음 오시는 분도 환영!',
    interests: ['soccer', 'baseball'], dayOffsets: range(1, 14), timeSlots: ['afternoon', 'evening'], budgetMax: 60000,
    conditions: {
      soccer: { team: '서울 연고팀', experience: '자주 가요', cheer: '서포터석 응원', seatBudget: '2만 원 이하' },
      baseball: { team: '서울 연고팀', experience: '몇 번 가봤어요', cheer: '상관없음', seatBudget: '2~4만 원' },
    },
    traits: [100, 100, 50, 50, 50], reverseOptIn: true, avatarHue: 0,
  },
  {
    id: 'p05', nickname: '야경수집가', ageRange: '20대 후반', schoolName: '별빛대학교(가상)', verification: 'example',
    bio: '공연 끝나고 야경 보며 걷는 코스를 좋아해요.',
    interests: ['performance', 'food'], dayOffsets: range(1, 14), timeSlots: ['evening'], budgetMax: 120000,
    conditions: { performance: { genre: ['밴드', '발라드·인디'], zone: '스탠딩', after: '간단히 식사' } },
    traits: [50, 50, 50, 100, 100], reverseOptIn: true, avatarHue: 270,
  },
  {
    id: 'p06', nickname: '소금빵', ageRange: '20대 초반', schoolName: '한빛대학교(가상)', verification: 'example',
    bio: '전시는 천천히, 영화는 끝나고 수다까지.',
    interests: ['exhibition', 'movie', 'food'], dayOffsets: range(2, 12), timeSlots: ['morning', 'afternoon', 'evening'], budgetMax: 35000,
    conditions: {
      exhibition: { viewPace: '천천히 오래', talk: '관람 후 이야기', after: '카페 30분' },
      movie: { genre: ['로맨스', '애니메이션'], afterTalk: '짧게 감상 나누기', seat: '가운데' },
      food: { menu: ['디저트·카페', '양식'], area: '성수·건대', costRange: '2만 원대' },
    },
    traits: [0, 50, 0, 50, 50], reverseOptIn: true, avatarHue: 30,
  },
  {
    id: 'p07', nickname: '오늘도직관', ageRange: '20대 초반', schoolName: '누리대학교(가상)', verification: 'example',
    bio: '야구 축구 가리지 않는 직관러. 팀은 크게 안 가려요.',
    interests: ['baseball', 'soccer'], dayOffsets: range(1, 14), timeSlots: ['afternoon', 'evening'], budgetMax: 40000,
    conditions: {
      baseball: { team: '팀 무관', experience: '자주 가요', cheer: '상관없음', seatBudget: '2~4만 원' },
      soccer: { team: '팀 무관', experience: '몇 번 가봤어요', cheer: '상관없음', seatBudget: '2만 원 이하' },
    },
    traits: [50, 50, 50, 50, 50], reverseOptIn: true, avatarHue: 200,
  },
  {
    id: 'p08', nickname: '팝업헌터', ageRange: '20대 초반', schoolName: '새솔대학교(가상)', verification: 'none',
    bio: '성수 팝업은 오픈런 해야 제맛. 굿즈 욕심 많아요.',
    interests: ['shopping', 'food'], dayOffsets: range(1, 10), timeSlots: ['morning', 'afternoon'], budgetMax: 80000,
    conditions: {
      shopping: { items: ['캐릭터 굿즈', '소품·리빙'], purpose: '살 것 정하고 구매', pace: '빠르게 여러 곳', photo: '인증샷 많이' },
      food: { menu: ['디저트·카페'], area: '성수·건대', costRange: '2만 원대' },
    },
    traits: [0, 50, 100, 100, 100], reverseOptIn: true, avatarHue: 320,
  },
  {
    id: 'p09', nickname: '느긋한고양이', ageRange: '20대 중반', schoolName: '다온대학교(가상)', verification: 'example',
    bio: '조용히 걷고 조용히 감상하는 편이에요.',
    interests: ['picnic', 'exhibition'], dayOffsets: range(1, 14), timeSlots: ['morning', 'afternoon'], budgetMax: 30000,
    conditions: {
      picnic: { spot: '숲길·둘레길', walk: '2시간 이상', prep: '각자 준비' },
      exhibition: { viewPace: '천천히 오래', talk: '관람 중엔 조용히', after: '바로 해산' },
    },
    // 역매칭 공개에 동의하지 않은 예시 참여자 → 후보에서 제외돼야 한다
    traits: [0, 0, 0, 50, 0], reverseOptIn: false, avatarHue: 45,
  },
  {
    id: 'p10', nickname: '밴드덕후', ageRange: '20대 초반', schoolName: '별빛대학교(가상)', verification: 'none',
    bio: '스탠딩 앞줄 사수가 목표. 공연 끝나면 바로 집에 가요.',
    interests: ['performance', 'movie'], dayOffsets: range(1, 14), timeSlots: ['afternoon', 'evening'], budgetMax: 100000,
    conditions: {
      performance: { genre: ['밴드', '힙합'], zone: '스탠딩', after: '바로 해산' },
      movie: { genre: ['액션', '공포·스릴러'], afterTalk: '바로 해산', seat: '앞쪽' },
    },
    traits: [50, 0, 50, 50, 100], reverseOptIn: true, avatarHue: 350,
  },
  {
    id: 'p11', nickname: '카페투어', ageRange: '20대 중반', schoolName: '한빛대학교(가상)', verification: 'example',
    bio: '디저트 맛집 지도를 만들고 있어요.',
    interests: ['food', 'shopping', 'picnic'], dayOffsets: range(1, 14), timeSlots: ['morning', 'afternoon', 'evening'], budgetMax: 40000,
    conditions: {
      food: { menu: ['디저트·카페', '일식'], area: '상관없음', costRange: '2만 원대' },
      shopping: { items: ['소품·리빙', '빈티지'], purpose: '구경 위주', pace: '보통', photo: '가끔' },
      picnic: { spot: '상관없음', walk: '1시간 정도', prep: '나눠서 준비' },
    },
    traits: [0, 100, 50, 50, 50], reverseOptIn: true, avatarHue: 25,
  },
  {
    id: 'p12', nickname: '새벽러닝', ageRange: '20대 후반', schoolName: '누리대학교(가상)', verification: 'example',
    bio: '아침형 인간. 피크닉도 직관도 일찍 시작하는 게 좋아요.',
    interests: ['picnic', 'soccer'], dayOffsets: range(1, 14), timeSlots: ['morning', 'afternoon'], budgetMax: 30000,
    conditions: {
      picnic: { spot: '한강', walk: '2시간 이상', prep: '각자 준비' },
      soccer: { team: '수원 연고팀', experience: '몇 번 가봤어요', cheer: '일반석 관람', seatBudget: '2만 원 이하' },
    },
    // 역매칭 공개에 동의하지 않은 예시 참여자
    traits: [50, 50, 100, 100, 0], reverseOptIn: false, avatarHue: 90,
  },
  {
    id: 'p13', nickname: '영화일기', ageRange: '20대 초반', schoolName: '새솔대학교(가상)', verification: 'none',
    bio: '보고 나서 한 줄 평 남기는 걸 좋아해요.',
    interests: ['movie', 'exhibition'], dayOffsets: range(1, 14), timeSlots: ['afternoon', 'evening'], budgetMax: 30000,
    conditions: {
      movie: { genre: ['독립영화', '로맨스', '애니메이션'], afterTalk: '짧게 감상 나누기', seat: '가운데' },
      exhibition: { viewPace: '보통', talk: '관람 후 이야기', after: '카페 30분' },
    },
    traits: [0, 50, 0, 50, 50], reverseOptIn: true, avatarHue: 240,
  },
  {
    id: 'p14', nickname: '첫직관', ageRange: '20대 초반', schoolName: '다온대학교(가상)', verification: 'none',
    bio: '야구장은 처음이라 같이 가 줄 분을 찾아요!',
    interests: ['baseball'], dayOffsets: range(1, 14), timeSlots: ['afternoon', 'evening'], budgetMax: 35000,
    conditions: { baseball: { team: '서울 연고팀', experience: '처음이에요', cheer: '적당히 박수', seatBudget: '2~4만 원' } },
    traits: [0, 100, 50, 50, 50], reverseOptIn: true, avatarHue: 180,
  },
];

interface GroupSeed extends Omit<Group, 'date' | 'isSeed'> {
  dayOffset: number;
}

const t = (v: Traits) => v;

const GROUP_SEED: GroupSeed[] = [
  {
    id: 'g01', category: 'baseball', title: '평일 저녁 야구 직관, 적당히 응원하실 분',
    description: '퇴근·수업 후 가볍게 보는 평일 경기예요. 응원가는 따라 부르되 무리하지 않는 분위기, 경기 끝나면 바로 해산합니다.',
    hostId: 'p01', place: '서울 ○○야구장 (예시)', meetingPoint: '야구장 역 출구 앞 광장 (공개 장소)',
    dayOffset: 4, startTime: '18:00', endTime: '21:30', capacity: 3, memberIds: ['p01', 'p04'],
    cost: { total: 25000, included: ['내야 일반석 티켓(각자 예매)'], separate: ['구장 내 먹거리', '응원 도구'] },
    prefs: t([0, 50, 50, 50, 50]),
    conditions: { team: '서울 연고팀', experience: '몇 번 가봤어요', cheer: '적당히 박수', seatBudget: '2~4만 원' },
    route: [{ time: '18:00', label: '출구 앞 광장에서 만나기' }, { time: '18:20', label: '입장·좌석 착석' }, { time: '18:30', label: '경기 관람' }, { time: '21:30', label: '경기 종료 후 해산' }],
    extras: [{ label: '경기 후 치킨', required: false }],
    dismissPlan: '경기 종료 직후 출구 앞에서 해산', cancelPolicy: '경기 하루 전까지 채팅으로 알려주세요. 우천 취소 시 모임도 자동 취소돼요.',
    demoHostable: true,
  },
  {
    id: 'g02', category: 'baseball', title: '첫 직관 환영! 응원가 같이 배워요',
    description: '야구장이 처음인 분들을 위한 모임이에요. 응원가와 기본 규칙을 알려드리고 1루 응원석에서 신나게 응원해요.',
    hostId: 'p04', place: '서울 ○○야구장 (예시)', meetingPoint: '야구장 매표소 앞 (공개 장소)',
    dayOffset: 6, startTime: '17:00', endTime: '21:00', capacity: 6, memberIds: ['p04', 'p07'],
    cost: { total: 30000, included: ['응원석 티켓(각자 예매)'], separate: ['응원 막대(선택)', '먹거리'] },
    prefs: t([100, 100, 50, 50, 50]),
    conditions: { team: '서울 연고팀', experience: '처음이에요', cheer: '응원가 열창', seatBudget: '2~4만 원' },
    route: [{ time: '17:00', label: '매표소 앞 집합, 응원가 미리 듣기' }, { time: '17:40', label: '입장' }, { time: '18:30', label: '경기 관람·응원' }, { time: '21:00', label: '해산' }],
    extras: [{ label: '응원 도구 구매', required: false }, { label: '경기 후 뒤풀이', required: false }],
    dismissPlan: '경기 종료 후 매표소 앞에서 해산', cancelPolicy: '경기 이틀 전까지 취소 가능. 우천 취소 시 자동 취소.',
  },
  {
    id: 'g03', category: 'soccer', title: '주말 축구 직관, 서포터석에서 90분 응원',
    description: '서포터석에서 서서 응원하는 모임이에요. 처음이어도 괜찮지만 90분 서서 응원하는 분위기인 점 참고해 주세요.',
    hostId: 'p04', place: '서울 ○○경기장 (예시)', meetingPoint: '경기장 북측 광장 안내판 앞 (공개 장소)',
    dayOffset: 5, startTime: '16:00', endTime: '19:30', capacity: 5, memberIds: ['p04'],
    cost: { total: 18000, included: ['서포터석 티켓(각자 예매)'], separate: ['유니폼·머플러(선택)'] },
    prefs: t([100, 100, 50, 50, 50]),
    conditions: { team: '서울 연고팀', experience: '몇 번 가봤어요', cheer: '서포터석 응원', seatBudget: '2만 원 이하' },
    route: [{ time: '16:00', label: '북측 광장 집합' }, { time: '16:30', label: '입장·응원 준비' }, { time: '17:00', label: '경기 관람' }, { time: '19:30', label: '해산' }],
    extras: [{ label: '머플러 구매', required: false }],
    dismissPlan: '경기 종료 후 북측 광장에서 해산', cancelPolicy: '경기 하루 전까지 취소 가능.',
  },
  {
    id: 'g04', category: 'soccer', title: '일반석에서 편하게 축구 보기',
    description: '서서 응원하기보다는 앉아서 경기 흐름을 즐기고 싶은 분들과 함께해요. 전술 이야기 환영.',
    hostId: 'p07', place: '수원 ○○경기장 (예시)', meetingPoint: '경기장 정문 매표소 앞 (공개 장소)',
    dayOffset: 9, startTime: '14:00', endTime: '17:00', capacity: 4, memberIds: ['p07'],
    cost: { total: 15000, included: ['일반석 티켓(각자 예매)'], separate: ['먹거리'] },
    prefs: t([0, 50, 50, 50, 0]),
    conditions: { team: '팀 무관', experience: '몇 번 가봤어요', cheer: '일반석 관람', seatBudget: '2만 원 이하' },
    route: [{ time: '14:00', label: '정문 매표소 앞 집합' }, { time: '14:30', label: '경기 관람' }, { time: '17:00', label: '해산' }],
    extras: [],
    dismissPlan: '경기 종료 후 정문에서 해산', cancelPolicy: '하루 전까지 취소 가능.',
  },
  {
    id: 'g05', category: 'exhibition', title: '조용히 오래 보는 전시 산책',
    description: '작품 앞에서 충분히 머무는 관람을 좋아하는 분들과 함께해요. 관람 중엔 각자, 관람 후 카페에서 30분 감상을 나눠요.',
    hostId: 'p02', place: '종로 ○○미술관 (예시)', meetingPoint: '미술관 1층 로비 안내데스크 앞 (공개 장소)',
    dayOffset: 3, startTime: '11:00', endTime: '14:00', capacity: 3, memberIds: ['p02'],
    cost: { total: 15000, included: ['전시 입장료'], separate: ['카페 음료(선택)'] },
    prefs: t([0, 50, 0, 50, 0]),
    conditions: { viewPace: '천천히 오래', talk: '관람 후 이야기', after: '카페 30분' },
    route: [{ time: '11:00', label: '로비에서 만나기' }, { time: '11:10', label: '각자 관람 (약 2시간)' }, { time: '13:20', label: '근처 카페에서 감상 나누기' }, { time: '14:00', label: '해산' }],
    extras: [{ label: '카페 감상 나누기', required: false }],
    dismissPlan: '카페 앞에서 해산 (카페는 선택)', cancelPolicy: '전날 저녁 8시까지 알려주세요.',
    demoHostable: true,
  },
  {
    id: 'g06', category: 'exhibition', title: '하루 두 전시, 핵심만 알차게',
    description: '같은 동네 전시 두 곳을 핵심 위주로 빠르게 보고 이동해요. 보면서 이야기 나누는 분위기예요.',
    hostId: 'p03', place: '한남·이태원 일대 갤러리 (예시)', meetingPoint: '지하철역 1번 출구 앞 (공개 장소)',
    dayOffset: 8, startTime: '13:00', endTime: '17:30', capacity: 4, memberIds: ['p03', 'p13'],
    cost: { total: 28000, included: ['전시 2곳 입장료'], separate: ['간식·음료'] },
    prefs: t([50, 100, 100, 100, 50]),
    conditions: { viewPace: '핵심만 빠르게', talk: '보면서 이야기', after: '식사까지' },
    route: [{ time: '13:00', label: '1번 출구 집합' }, { time: '13:15', label: '첫 번째 갤러리' }, { time: '15:00', label: '도보 이동·간식' }, { time: '15:30', label: '두 번째 갤러리' }, { time: '17:30', label: '해산' }],
    extras: [{ label: '저녁 식사', required: false }],
    dismissPlan: '두 번째 갤러리 앞에서 해산', cancelPolicy: '이틀 전까지 취소 가능.',
  },
  {
    id: 'g07', category: 'shopping', title: '성수 팝업 3곳 오픈런',
    description: '보고 싶은 팝업 3곳을 동선대로 빠르게 돌아요. 굿즈 구매가 목적이라 줄 서는 시간이 있어요.',
    hostId: 'p08', place: '성수동 일대 (예시)', meetingPoint: '성수역 3번 출구 앞 (공개 장소)',
    dayOffset: 2, startTime: '10:30', endTime: '15:00', capacity: 4, memberIds: ['p08'],
    cost: { total: 40000, included: [], separate: ['굿즈 구매(본인 선택)', '점심 식사'] },
    prefs: t([0, 50, 100, 100, 100]),
    conditions: { items: ['캐릭터 굿즈', '소품·리빙'], purpose: '살 것 정하고 구매', pace: '빠르게 여러 곳', photo: '인증샷 많이' },
    route: [{ time: '10:30', label: '성수역 3번 출구 집합' }, { time: '10:45', label: '팝업 ① 대기·입장' }, { time: '12:00', label: '팝업 ②' }, { time: '13:00', label: '점심' }, { time: '14:00', label: '팝업 ③' }, { time: '15:00', label: '해산' }],
    extras: [{ label: '굿즈 구매', required: false }, { label: '점심 식사', required: true }],
    dismissPlan: '마지막 팝업 앞에서 해산', cancelPolicy: '전날 정오까지 취소 가능.',
  },
  {
    id: 'g08', category: 'shopping', title: '연남동 소품샵 느긋하게 구경',
    description: '사지 않아도 괜찮아요. 소품샵과 빈티지숍을 천천히 구경하고 사진은 가끔만 찍어요.',
    hostId: 'p11', place: '연남동 일대 (예시)', meetingPoint: '홍대입구역 3번 출구 앞 (공개 장소)',
    dayOffset: 7, startTime: '14:00', endTime: '17:00', capacity: 3, memberIds: ['p11'],
    cost: { total: 10000, included: [], separate: ['음료', '소품 구매(본인 선택)'] },
    prefs: t([0, 100, 0, 0, 50]),
    conditions: { items: ['소품·리빙', '빈티지'], purpose: '구경 위주', pace: '한 곳 오래', photo: '가끔' },
    route: [{ time: '14:00', label: '3번 출구 집합' }, { time: '14:15', label: '소품샵 골목 산책' }, { time: '15:30', label: '카페 휴식' }, { time: '17:00', label: '해산' }],
    extras: [{ label: '카페 휴식', required: false }],
    dismissPlan: '출구 근처에서 해산', cancelPolicy: '당일 오전까지 취소 가능.',
  },
  {
    id: 'g09', category: 'performance', title: '인디 밴드 공연 스탠딩 같이 가요',
    description: '스탠딩 구역에서 같이 뛰어요. 각자 예매 후 입장 전 만나서 같이 들어가요. 공연 후 간단히 식사(선택).',
    hostId: 'p05', place: '홍대 ○○공연장 (예시)', meetingPoint: '공연장 건물 앞 안내판 (공개 장소)',
    dayOffset: 10, startTime: '19:00', endTime: '22:00', capacity: 4, memberIds: ['p05', 'p10'],
    cost: { total: 55000, included: ['공연 티켓(각자 예매)'], separate: ['물품보관함', '공연 후 식사(선택)'] },
    prefs: t([50, 50, 50, 100, 100]),
    conditions: { genre: ['밴드', '발라드·인디'], zone: '스탠딩', after: '간단히 식사' },
    route: [{ time: '19:00', label: '공연장 앞 집합' }, { time: '19:30', label: '입장' }, { time: '20:00', label: '공연 관람' }, { time: '22:00', label: '해산 또는 식사(선택)' }],
    extras: [{ label: '공연 후 식사', required: false }],
    dismissPlan: '공연장 앞에서 해산, 식사는 원하는 사람만', cancelPolicy: '티켓 양도는 각자 공식 정책을 따르세요. 모임은 하루 전까지 취소 가능.',
  },
  {
    id: 'g10', category: 'food', title: '성수 디저트 카페 웨이팅 같이',
    description: '혼자 웨이팅하기 아쉬운 디저트 카페에 함께 가요. 메뉴 나눠 먹기 가능.',
    hostId: 'p06', place: '성수동 (예시)', meetingPoint: '성수역 2번 출구 앞 (공개 장소)',
    dayOffset: 3, startTime: '13:00', endTime: '15:30', capacity: 3, memberIds: ['p06'],
    cost: { total: 20000, included: [], separate: ['음료·디저트 각자 계산'] },
    prefs: t([0, 50, 0, 50, 50]),
    conditions: { menu: ['디저트·카페'], area: '성수·건대', costRange: '2만 원대' },
    route: [{ time: '13:00', label: '2번 출구 집합' }, { time: '13:10', label: '카페 웨이팅' }, { time: '14:00', label: '디저트 타임' }, { time: '15:30', label: '해산' }],
    extras: [],
    dismissPlan: '카페 앞에서 해산', cancelPolicy: '전날까지 취소 가능.',
    demoHostable: true,
  },
  {
    id: 'g11', category: 'food', title: '을지로 노포 저녁 한 끼',
    description: '노포 감성의 한식 저녁. 메뉴는 현장에서 같이 고르고 1인 3만 원 안쪽으로 맞춰요.',
    hostId: 'p01', place: '을지로 일대 (예시)', meetingPoint: '을지로3가역 4번 출구 앞 (공개 장소)',
    dayOffset: 11, startTime: '18:30', endTime: '20:30', capacity: 4, memberIds: ['p01'],
    cost: { total: 30000, included: [], separate: ['식사비 1/N'] },
    prefs: t([50, 100, 50, 0, 50]),
    conditions: { menu: ['한식'], area: '종로·을지로', costRange: '3만 원 이상' },
    route: [{ time: '18:30', label: '4번 출구 집합' }, { time: '18:40', label: '식당 이동·식사' }, { time: '20:30', label: '해산' }],
    extras: [{ label: '2차 카페', required: false }],
    dismissPlan: '식당 앞에서 해산', cancelPolicy: '전날까지 취소 가능.',
  },
  {
    id: 'g12', category: 'picnic', title: '한강 노을 피크닉',
    description: '돗자리 펴고 노을 보는 가벼운 피크닉. 간식은 나눠서 준비해요. 처음 보는 사람끼리 이야기 나누는 분위기.',
    hostId: 'p03', place: '한강공원 (예시)', meetingPoint: '한강공원 안내센터 앞 (공개 장소)',
    dayOffset: 5, startTime: '17:00', endTime: '20:00', capacity: 6, memberIds: ['p03', 'p11'],
    cost: { total: 8000, included: ['돗자리(호스트 지참)'], separate: ['간식 나눠 준비'] },
    prefs: t([100, 100, 0, 0, 0]),
    conditions: { spot: '한강', walk: '30분 이내', prep: '나눠서 준비' },
    route: [{ time: '17:00', label: '안내센터 앞 집합' }, { time: '17:20', label: '자리 잡고 피크닉' }, { time: '19:30', label: '정리' }, { time: '20:00', label: '해산' }],
    extras: [],
    dismissPlan: '안내센터 앞에서 해산', cancelPolicy: '비 예보 시 전날 저녁에 취소 공지.',
  },
  {
    id: 'g13', category: 'movie', title: '애니메이션 영화 보고 한 줄 평',
    description: '조조 혹은 낮 시간 애니메이션 영화를 보고 근처에서 20분 정도 감상을 나눠요.',
    hostId: 'p13', place: '신촌 ○○영화관 (예시)', meetingPoint: '영화관 로비 매표소 앞 (공개 장소)',
    dayOffset: 6, startTime: '13:30', endTime: '16:30', capacity: 4, memberIds: ['p13'],
    cost: { total: 14000, included: ['영화 티켓(각자 예매)'], separate: ['팝콘·음료'] },
    prefs: t([0, 50, 0, 50, 50]),
    conditions: { genre: ['애니메이션', '독립영화'], afterTalk: '짧게 감상 나누기', seat: '가운데' },
    route: [{ time: '13:30', label: '로비 집합' }, { time: '13:50', label: '영화 관람' }, { time: '16:00', label: '근처 벤치에서 감상 나누기' }, { time: '16:30', label: '해산' }],
    extras: [{ label: '감상 나누기', required: false }],
    dismissPlan: '영화관 앞에서 해산', cancelPolicy: '예매 전까지 자유롭게 취소.',
  },
  {
    id: 'g14', category: 'picnic', title: '아침 숲길 걷기 2시간',
    description: '말없이 걸어도 괜찮은 아침 산책 모임. 각자 물만 챙겨 오세요.',
    hostId: 'p12', place: '서울 둘레길 일부 구간 (예시)', meetingPoint: '둘레길 입구 안내판 앞 (공개 장소)',
    dayOffset: 12, startTime: '08:00', endTime: '10:30', capacity: 4, memberIds: ['p12'],
    cost: { total: 0, included: [], separate: ['개인 음료'] },
    prefs: t([0, 0, 50, 100, 0]),
    conditions: { spot: '숲길·둘레길', walk: '2시간 이상', prep: '각자 준비' },
    route: [{ time: '08:00', label: '입구 안내판 집합' }, { time: '08:10', label: '숲길 걷기' }, { time: '10:30', label: '출구에서 해산' }],
    extras: [],
    dismissPlan: '구간 출구에서 해산', cancelPolicy: '전날 저녁까지 취소 가능.',
  },
];

export function buildSeed(today: string): { people: Person[]; groups: Group[] } {
  const people: Person[] = PEOPLE_SEED.map(({ dayOffsets, ...p }) => ({
    ...p,
    dates: dayOffsets.map((o) => addDays(today, o)),
  }));
  const groups: Group[] = GROUP_SEED.map(({ dayOffset, ...g }) => ({
    ...g,
    date: addDays(today, dayOffset),
    isSeed: true,
  }));
  return { people, groups };
}
