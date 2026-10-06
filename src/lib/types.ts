export type CategoryId =
  | 'baseball'
  | 'soccer'
  | 'shopping'
  | 'exhibition'
  | 'performance'
  | 'movie'
  | 'food'
  | 'picnic';

/** 성향 축 값은 0·50·100 세 단계로만 저장한다. */
export type AxisValue = 0 | 50 | 100;

/** [동행 인원, 교류 방식, 활동 속도, 계획 방식, 지출 성향] */
export type Traits = [AxisValue, AxisValue, AxisValue, AxisValue, AxisValue];

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export type ConditionValue = string | string[];
export type ConditionMap = Record<string, ConditionValue>;

export type VerificationLabel = 'example' | 'none';

export interface Person {
  id: string;
  nickname: string;
  ageRange: string;
  /** 가상 학교 이름. 학교 이메일·전화번호·학번은 보관하지 않는다. */
  schoolName: string;
  verification: VerificationLabel;
  bio: string;
  interests: CategoryId[];
  /** 가능한 날짜 (YYYY-MM-DD) */
  dates: string[];
  timeSlots: TimeSlot[];
  budgetMax: number;
  conditions: Partial<Record<CategoryId, ConditionMap>>;
  traits: Traits;
  reverseOptIn: boolean;
  avatarHue: number;
}

export interface CostInfo {
  /** 1인 예상 비용(원) */
  total: number;
  included: string[];
  separate: string[];
}

export interface ExtraActivity {
  label: string;
  required: boolean;
}

export interface RouteStep {
  time: string;
  label: string;
}

export interface Group {
  id: string;
  category: CategoryId;
  title: string;
  description: string;
  hostId: string;
  /** 활동 장소 (지역 단위의 일반 명칭) */
  place: string;
  /** 공개된 첫 만남 장소 — 공개 장소만 허용 */
  meetingPoint: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  capacity: number; // 호스트 포함 정원
  memberIds: string[]; // 호스트 포함 현재 멤버
  cost: CostInfo;
  prefs: Traits;
  conditions: ConditionMap;
  route: RouteStep[];
  extras: ExtraActivity[];
  dismissPlan: string;
  cancelPolicy: string;
  isSeed: boolean;
  /** 시연용: 사용자가 이 그룹의 호스트 역할을 체험할 수 있다 */
  demoHostable?: boolean;
  createdAt?: string;
}

export interface Profile {
  nickname: string;
  ageRange: string;
  interests: CategoryId[];
  dates: string[];
  timeSlots: TimeSlot[];
  budgetMax: number;
  conditions: Partial<Record<CategoryId, ConditionMap>>;
}

export type DraftAnswers = [
  AxisValue | null,
  AxisValue | null,
  AxisValue | null,
  AxisValue | null,
  AxisValue | null,
];

export interface TestState {
  draft: DraftAnswers;
  /** 5문항을 모두 마치고 확정한 결과. 미완료면 null */
  result: Traits | null;
  completedAt: string | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface Invitation {
  id: string;
  groupId: string;
  hostId: string;
  participantId: string;
  message: string;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}

export type JoinRequestStatus = 'pending' | 'cancelled';

export interface JoinRequest {
  groupId: string;
  message: string;
  status: JoinRequestStatus;
  createdAt: string;
}

export type ReportTargetType = 'group' | 'member';

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  reason: string;
  detail: string;
  createdAt: string;
}

export interface Block {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  createdAt: string;
}

export interface VerificationState {
  schoolId: string | null;
  /** 체험 모드 완료는 실제 인증이 아니다. */
  status: 'none' | 'demo-completed';
  completedAt: string | null;
}

export interface AppState {
  version: 1;
  profile: Profile;
  test: TestState;
  reverseOptIn: boolean;
  verification: VerificationState;
  savedGroupIds: string[];
  createdGroups: Group[];
  joinRequests: JoinRequest[];
  invitations: Invitation[];
  reports: Report[];
  blocks: Block[];
  /** 역매칭 수락으로 추가된 멤버 (그룹 id → 참여자 id 목록) */
  acceptedMembers: Record<string, string[]>;
}

export const ME = 'me';
