// 온유 도메인 타입. 모든 값은 시연용 가상 데이터이며 실제 회원·결제·인바디와 연결되지 않는다.

export type ISODate = string; // 'YYYY-MM-DD' (Asia/Seoul 기준 날짜)
export type ISODateTime = string; // ISO 8601 (UTC 저장)

export type StaffKind = 'manager' | 'coach';
export interface Staff {
  id: string;
  name: string;
  kind: StaffKind;
  /** 운영계획상 요구 자격 (검증된 인증 배지가 아님) */
  plannedQualification: string;
  contract?: boolean;
}

export type PlanType = '1m' | '3m';
export type MembershipStatus = 'active' | 'paused' | 'cancelled';
export interface Membership {
  id: string;
  plan: PlanType;
  startDate: ISODate;
  endDate: ISODate;
  status: MembershipStatus;
  /** 시연용 가상 금액 (원) */
  price: number;
  createdAt: ISODateTime;
}

export interface MembershipLog {
  id: string;
  at: ISODateTime;
  by: string; // staff id
  action: string;
  detail: string;
}

export interface CareNote {
  id: string;
  at: ISODateTime;
  by: string;
  kind: 'consult' | 'adjust';
  text: string;
}

export interface Questionnaire {
  updatedAt: ISODate;
  conditions: string[]; // 문진: 복용약·병력 (가상)
  pain: string;
  exerciseHistory: string;
  fitnessSummary: string; // 기초체력 측정 요약 (가상)
}

export interface DietCheck {
  updatedAt: ISODateTime;
  regularity: 'regular' | 'sometimes' | 'irregular';
  intakeChange: 'same' | 'less' | 'more';
  proteinFoods: 'daily' | 'sometimes' | 'rarely';
}

export interface ExercisePlan {
  text: string;
  by: string;
  updatedAt: ISODateTime;
}

export type FontScale = 'normal' | 'large';
export interface NotificationPrefs {
  feedback: boolean;
  explanation: boolean;
  waitlist: boolean;
  inquiry: boolean;
}

export interface Member {
  id: string;
  name: string;
  ageGroup: string;
  memberNo: string;
  joinedAt: ISODate;
  memberships: Membership[];
  membershipLog: MembershipLog[];
  trialTotal: number; // 신규 무료체험 총 2회
  precautions: string[]; // 코치에게 보이는 주의사항
  careNotes: CareNote[]; // 상담·운동 조정 기록
  questionnaire: Questionnaire; // 전체 문진 (매니저만)
  exercisePlan?: ExercisePlan;
  dietCheck?: DietCheck;
  prefs: { fontScale: FontScale; speechRate: 'normal' | 'slow'; notifications: NotificationPrefs };
}

export type ConditionLevel = 'good' | 'tired' | 'discomfort';
export interface ConditionReport {
  level: ConditionLevel;
  tags: string[];
  memo: string;
  at: ISODateTime;
  checkedBy?: string; // 운영진이 확인한 경우 staff id
  checkedAt?: ISODateTime;
}

export type BookingStatus = 'booked' | 'cancelled' | 'attended' | 'absent';
export type BookingKind = 'paid' | 'trial';
export interface Booking {
  id: string;
  sessionId: string;
  memberId: string;
  status: BookingStatus;
  kind: BookingKind;
  createdAt: ISODateTime;
  cancelledAt?: ISODateTime;
  attendanceBy?: string;
  attendanceAt?: ISODateTime;
  condition?: ConditionReport;
}

export type WaitStatus = 'waiting' | 'offered' | 'confirmed' | 'cancelled';
export interface WaitEntry {
  id: string;
  sessionId: string;
  memberId: string;
  status: WaitStatus;
  createdAt: ISODateTime;
  offeredAt?: ISODateTime;
  resolvedAt?: ISODateTime;
}

export interface BodyValues {
  weight: number; // kg
  skeletalMuscle: number; // kg 골격근량
  bodyFatMass: number; // kg 체지방량
  bodyFatPercent: number; // %
  bmi: number; // kg/m²
  totalBodyWater: number; // L 체수분
  protein: number; // kg 체성분 단백질 (식사 섭취량 아님)
  mineral: number; // kg
}

export type ExplanationStatus = 'pending' | 'draft' | 'published';
export interface Measurement {
  id: string;
  externalId: string; // 외부 결과 ID 또는 시연 이벤트 ID (중복 수신 방지 키)
  memberId: string;
  measuredAt: ISODateTime;
  receivedAt: ISODateTime;
  source: 'demo' | 'inbody';
  device: string;
  values: BodyValues;
  explanation: {
    status: ExplanationStatus;
    text: string; // 초안 또는 공개본
    coachNote: string; // 코치에게 전달할 지도 사항
    updatedBy?: string;
    updatedAt?: ISODateTime;
    publishedAt?: ISODateTime;
  };
}

export type FeedbackResponse = 'understood' | 'need_more';
export interface Feedback {
  id: string;
  bookingId: string;
  sessionId: string;
  memberId: string;
  coachId: string;
  activity: string;
  didWell: string;
  nextAdjust: string;
  status: 'draft' | 'published';
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  publishedAt?: ISODateTime;
  response?: FeedbackResponse;
  respondedAt?: ISODateTime;
  followUp?: { text: string; by: string; at: ISODateTime };
}

export type ProductCategory = 'protein' | 'snack' | 'drink';
export interface Product {
  id: string;
  name: string;
  seller: string;
  category: ProductCategory;
  volume: string;
  ingredients: string;
  allergens: string;
  listPrice: number; // 정수 원
  discountType: 'rate' | 'amount';
  discountValue: number; // rate: %, amount: 원
  shippingFee: number;
  freeShippingOver: number; // 이 금액 이상이면 무료 (0이면 항상 유료)
  benefitStart: ISODate;
  benefitEnd: ISODate;
  active: boolean;
  art: { shape: 'bottle' | 'carton' | 'bar' | 'box' | 'pouch' | 'can'; color: string };
}

export interface Coupon {
  id: string;
  code: string;
  memberId: string;
  productId: string;
  issuedAt: ISODateTime;
  expiresOn: ISODate;
  /** 시연 상태 – 실제 사용·정산과 무관 */
  demoUsedAt?: ISODateTime;
}

export type MallEventType = 'coupon_issued' | 'coupon_reshown' | 'purchase_page_open' | 'coupon_demo_used';
export interface MallEvent {
  id: string;
  type: MallEventType;
  memberId: string;
  productId: string;
  at: ISODateTime;
}

export type InquiryCategory = 'booking' | 'membership' | 'body' | 'mall' | 'diet' | 'other';
export interface Inquiry {
  id: string;
  memberId: string;
  category: InquiryCategory;
  message: string;
  createdAt: ISODateTime;
  status: 'open' | 'answered';
  answer?: string;
  answeredBy?: string;
  answeredAt?: ISODateTime;
}

export type NotificationType = 'feedback' | 'feedback_followup' | 'explanation' | 'measurement' | 'waitlist' | 'inquiry';
export interface AppNotification {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  createdAt: ISODateTime;
  read: boolean;
}

export type ViewRole = 'member' | 'staff';
export interface DemoState {
  view: ViewRole;
  staffKind: StaffKind;
  memberId: string;
  managerId: string;
  coachId: string;
  /** 시연 기준 시각 보정값(ms). 0이면 실제 현재 시각 */
  clockOffsetMs: number;
  seededAt: ISODateTime;
  eventSeq: number;
  lastDemoEventId?: string;
  idSeq: number;
}

export interface AppState {
  version: number;
  demo: DemoState;
  staff: Staff[];
  members: Member[];
  bookings: Booking[];
  waitlist: WaitEntry[];
  measurements: Measurement[];
  feedback: Feedback[];
  products: Product[];
  coupons: Coupon[];
  mallEvents: MallEvent[];
  inquiries: Inquiry[];
  notifications: AppNotification[];
}

export type Result<T = void> = { ok: true; state: AppState; value: T; message?: string } | { ok: false; error: string };
