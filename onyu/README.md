# 온:遊 온유 / ON YOU

**함께 움직이는 즐거움** · 운동과 휴식이 함께하는 공간, 온유.

60~75세(및 같은 수요의 50대)를 위한 프리미엄 커뮤니티 피트니스클럽의 **회원·운영 앱 시연용 프로토타입**입니다 (대학 과제 발표용).

> 모든 회원·건강 정보·상품·가격·제휴 조건은 **가상 시연 데이터**입니다. 실제 회원 정보, 실제 결제, 실제 인바디 연동, 실제 로그인은 없습니다.
> 상단의 역할 전환은 시연 장치이며 보안 인증이 아닙니다. 상태는 **이 브라우저의 localStorage에만** 저장되며 다른 기기와 동기화되지 않습니다.

## 실행

Node.js 20.19 이상 (22 권장). 이 폴더(`onyu/`)에서 실행합니다.

```bash
npm ci
npm run dev        # 개발 서버 http://localhost:5173
npm run build      # 타입 검사 + 빌드 (dist/)
npm run preview    # 빌드 결과 확인 http://localhost:4173
npm run lint       # ESLint
npm test           # 단위 테스트 (Vitest, 핵심 규칙 17개)
npm run test:e2e   # 브라우저 테스트 (Playwright, 390px·1440px)
```

E2E를 처음 실행하는 환경이라면 `npx playwright install chromium`이 필요할 수 있습니다.

## GitHub에 올릴 파일

`onyu/` 폴더 전체에서 `node_modules/`, `dist/`, `test-results/`, `.env*`(단 `.env.example` 제외)를 뺀 나머지입니다. `.gitignore`에 이미 반영되어 있습니다. `package-lock.json`은 반드시 포함합니다.

## Vercel 가져오기 설정

| 항목 | 값 |
| --- | --- |
| Root Directory | `onyu` (이 저장소에서는 하위 폴더) |
| Framework Preset | Vite |
| Install / Build | `npm ci` / `npm run build` |
| Output Directory | `dist` |
| 환경변수 | 필요 없음 |

`vercel.json`이 `/member/body` 같은 경로로 직접 접속·새로고침해도 `index.html`을 돌려주도록 SPA fallback을 설정합니다.

## 발표 시연 순서

1. **회원 화면** → 수업 예약 → 날짜 → 시간 → 예약 확인 → 완료 화면에서 컨디션 입력
2. **매니저 화면** → 수업 관리 → 해당 수업 → 컨디션 확인 → 출석
   (수업이 내일 이후라면 수업 화면의 “시연: 기준 시각을 이 수업 시작으로 옮기기” 사용)
3. 같은 수업에서 **“코치 화면에서 이 수업 열기”** → 개인 피드백 작성 → 회원에게 공개
4. **회원 화면** → 홈 새 소식 / 코치 설명 보기 → “설명이 더 필요해요”
5. **매니저 화면** → 측정·설명 관리 → 새 측정 결과 수신 시연 (중복 수신 확인 버튼도 있음) → 기록 열기 → 설명 검토·공개
6. **회원 화면** → 내 몸 알아보기: 쉬운 설명, 이전 측정 비교, 읽어주기/멈추기/다시 듣기
7. 온유 제휴몰 → 상품 → 할인코드 받기 → 코드 복사 → 구매 절차 시연 → 코드 적용·최종 금액 확인
8. **매니저 화면** → 제휴몰 관리: 코드 발급 수·구매 페이지 이동 수
9. 새로고침해도 상태 유지 확인 → 매니저 화면 **시연 설정 → 시연 초기화**(확인 창)로 발표 시작 상태 복원

이 흐름은 `e2e/demo-flow.spec.ts`가 실제 브라우저에서 그대로 검증합니다.

## 데이터와 초기화

- 저장 키 `onyu:demo:v1`, 데이터 버전 1. 형식이 다르거나 손상된 값은 `onyu:demo:corrupt-backup`에 백업하고 시연 데이터로 복구하며 화면에 안내합니다. 정상 데이터는 실행마다 초기화하지 않습니다.
- 시연 데이터는 처음 실행한 날짜(Asia/Seoul)를 기준으로 과거 출석·측정 기록과 앞으로 7일 예약(마감 6/6, 잔여 1석, 여유 수업)을 만듭니다. 수업 일정 자체는 날짜에서 계산되므로 날짜가 지나도 계속 예약할 수 있습니다.
- 저장에 실패하면 화면 상태를 바꾸지 않고 오류를 표시합니다.

## 구조

```
src/
  domain/     types(도메인 타입), schedule(운영 규칙·시간표), selectors(조회·집계), metrics(측정 항목)
  data/       seed(가상 회원 12명·운영진·상품 6개·문의)
  services/   booking, feedback, measurement, mall, member, demo – (state, 입력, now) → Result 순수 함수
  adapters/   storage(localStorage), inbody(측정 수신), partner(할인코드 발급) – 실제 API로 교체할 경계
  store/      공통 저장 계층 (저장 성공 시에만 상태 반영)
  components/ BrandLogo(워드마크 단일 컴포넌트), Layouts, DemoBar, Speak(읽어주기), ConditionForm …
  pages/      member/*, staff/*
e2e/          Playwright 시연 흐름·레이아웃 검증
```

## 목업 / 실제 연동 구분

| 기능 | 시제품 | 실제 운영에 필요한 것 |
| --- | --- | --- |
| 로그인·권한 | 시연용 역할 전환 (보안 아님) | 회원/운영진 계정 인증, 서버 측 권한 검사 |
| 저장 | 브라우저 localStorage (기기 간 공유 없음) | 서버 DB, `adapters/storage.ts`를 API 저장소로 교체 |
| 예약·대기 | 같은 브라우저 안에서 처리 | 동시 예약 시 정원 트랜잭션, 대기 알림 푸시 |
| 인바디 측정 | `demoInBodySource`가 가상 결과 생성 | 회원 동의 → 기기 측정 → **서버**가 InBody Connect/API 또는 LookinBody Web API로 수신 → 회원 식별 → 원본 저장(외부 결과 ID로 중복 방지) → 매니저 설명 공개. 지원 장비·API 계약·접근 키·비용은 확인 필요이며 현재 체결된 협업 없음 |
| 제휴몰 | 앱 안에서 코드 생성, 구매 절차는 로컬 시연 화면 | 제휴사 계약, 서버에서 제휴사 API로 코드 등록, 판매·결제·배송은 제휴사 |
| 결제 | 없음 (카드 정보 수집 안 함) | 제휴사 결제 |
| 알림 | 앱 안 알림만 | 문자·푸시 발송 서비스 |

**비밀 키 관리**: 인바디·제휴사 API 키는 서버에서만 다룹니다. `VITE_`로 시작하는 프런트엔드 환경변수나 Git에 넣지 마세요. 필요한 변수 이름은 값 없이 `.env.example`에만 적어 두었습니다.

## 해석 원칙 (앱에 반영됨)

- 체성분 수치만으로 영양소 부족·질병·근감소증을 확정하지 않고, 개선/악화 배지를 만들지 않습니다.
- 체성분 단백질 ≠ 식사로 먹은 단백질. 식사 상태는 회원이 직접 답하는 질문과 상담으로 확인합니다.
- 설명 초안은 미리 작성된 문구로 만들며(외부 AI 호출 없음) 매니저가 검토·공개해야 회원에게 보입니다.
- 근거 없는 표준 범위를 표시하지 않고, 개인의 이전 기록 비교와 지도자 설명을 중심으로 합니다.
- 건강 결과 화면과 제휴 상품 화면을 분리합니다.

참고 자료(제휴 근거 아님): [Vite](https://vite.dev/guide/) · [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite) · [InBody Connect/API](https://inbody.com/kr/en/products/category/software/23) · [LookinBody Web API](https://apikr.lookinbody.com/Home/Document) · [결과 항목 설명](https://qr.inbody.com/ri/770/adult/en)
