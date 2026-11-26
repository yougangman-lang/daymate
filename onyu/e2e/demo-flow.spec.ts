// 발표용 핵심 시연 순서 1~9를 실제 브라우저에서 확인한다.
// 기준 시각을 2026-11-25(수) 07:30 KST로 고정해 같은 날 수업 예약 → 출석 처리까지 이어서 검증한다.
import { expect, test, type Page } from '@playwright/test';

const FIXED = new Date('2026-11-25T07:30:00+09:00');

async function demoBar(page: Page) {
  return page.getByRole('region', { name: '시연 장치' });
}

async function toStaff(page: Page, kind: '매니저' | '코치' = '매니저') {
  const bar = await demoBar(page);
  await bar.getByRole('button', { name: '매니저 화면' }).click();
  await bar.getByRole('button', { name: kind, exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/);
}

async function toMember(page: Page) {
  await (await demoBar(page)).getByRole('button', { name: '회원 화면' }).click();
  await expect(page).toHaveURL(/\/member$/);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED);
});

test('핵심 시연 1~9: 예약 → 출석 → 피드백 → 측정 설명 → 제휴 코드 → 유지 → 초기화', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 1. 회원: 수업 예약 + 컨디션 입력
  await page.goto('/');
  await page.getByRole('button', { name: '회원 화면으로 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /한보람\(가상\) 님/ })).toBeVisible();
  await page.getByRole('navigation', { name: '회원 메뉴' }).getByRole('link', { name: '수업 예약' }).click();
  await page.getByRole('link', { name: /11월 25일 \(수\) · 오늘/ }).click();
  await page.getByRole('link', { name: /^10:30 .* 선택$/ }).click();
  await expect(page.getByRole('heading', { name: '예약 내용을 확인해 주세요' })).toBeVisible();
  await expect(page.getByText('유료 무제한 회원권 · 횟수 차감 없음')).toBeVisible();
  await page.getByRole('button', { name: '이 수업 예약하기' }).click();
  await expect(page.getByRole('heading', { name: '예약이 완료됐어요' })).toBeVisible();
  await page.getByRole('radio', { name: /불편한 곳이 있어요/ }).click();
  await page.getByRole('button', { name: '무릎' }).click();
  await page.getByLabel(/짧게 남길 말/).fill('계단에서 시큰해요');
  await page.getByRole('button', { name: '컨디션 전달하기' }).click();
  await expect(page.getByText('컨디션을 전달했어요. 수업 때 반영할게요.')).toBeVisible();

  // 중복 예약 방지: 같은 수업은 '예약함'으로 표시
  await page.goto('/member/book?date=2026-11-25');
  await expect(page.locator('li.slot', { hasText: '10:30' }).getByText('예약함')).toBeVisible();

  // 2. 매니저: 같은 예약·컨디션 확인 후 출석 처리
  await toStaff(page);
  await expect(page.getByText(/한보람\(가상\).*09:15|한보람\(가상\).*10:30/).first()).toBeVisible();
  await page.getByRole('link', { name: '수업 관리', exact: true }).click();
  await page.locator('a.session-row', { hasText: '10:30' }).click();
  const card = page.locator('li.roster-card', { hasText: '한보람(가상)' });
  await expect(card.getByText('불편한 곳이 있어요')).toBeVisible();
  await expect(card.getByText(/무릎/).first()).toBeVisible();
  await card.getByRole('button', { name: '컨디션 확인했어요' }).click();
  await card.getByRole('button', { name: '출석', exact: true }).click();
  await expect(card.getByText('출석으로 기록했어요.')).toBeVisible();

  // 3. 코치: 해당 회원에게 피드백 공개
  await page.getByRole('button', { name: /코치 화면에서 이 수업 열기/ }).click();
  await expect((await demoBar(page)).getByRole('button', { name: '코치', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const coachCard = page.locator('li.roster-card', { hasText: '한보람(가상)' });
  await coachCard.getByLabel('잘 수행한 점').fill('의자에서 일어설 때 무릎 방향을 잘 지키셨어요.');
  await coachCard.getByLabel('다음에 조정할 점').fill('다음에는 반복을 12회로 늘려 볼게요.');
  await coachCard.getByRole('button', { name: '회원에게 공개' }).click();
  await expect(coachCard.getByText(/피드백을 공개했어요/)).toBeVisible();

  // 4. 회원: 피드백 읽고 '설명이 더 필요해요'
  await toMember(page);
  await expect(page.getByText('코치 피드백이 도착했어요').first()).toBeVisible();
  await page.getByRole('link', { name: '코치 설명 보기' }).click();
  const fb = page.locator('li.feedback-card', { hasText: '의자에서 일어설 때 무릎 방향' });
  await fb.getByRole('button', { name: '설명이 더 필요해요' }).click();
  await expect(fb.getByText(/코치와 매니저에게 전달했어요/)).toBeVisible();

  // 운영진 화면에 반영
  await toStaff(page);
  await expect(page.locator('.ops-card', { hasText: '추가 설명 요청' })).toContainText('1건');

  // 5. 매니저: 새 측정 결과 수신 → (중복 수신 차단) → 설명 공개
  await page.getByRole('link', { name: /측정·설명 관리/ }).click();
  await page.getByLabel('결과를 받을 가상 회원').selectOption('mb01');
  await page.getByRole('button', { name: '새 측정 결과 수신 시연' }).click();
  await expect(page.getByText(/새 측정 결과를 저장했어요/)).toBeVisible();
  await page.getByRole('button', { name: /같은 결과 다시 보내기/ }).click();
  await expect(page.getByText(/이미 저장된 측정 결과예요/)).toBeVisible();

  // 공개 전: 회원은 원본만, 해석은 확인 중
  await toMember(page);
  await page.goto('/member/body');
  await expect(page.getByText('매니저가 결과를 확인하고 있어요')).toBeVisible();

  await toStaff(page);
  await page.getByRole('link', { name: /측정·설명 관리/ }).click();
  await page.getByRole('row', { name: /한보람\(가상\).*설명 확인 전/ }).getByRole('link').click();
  await page.getByLabel(/설명 \(2~3문장/).fill('이번 측정에서 골격근량이 조금 늘었어요. 수분 상태에 따라 달라질 수 있어 다음 측정과 함께 볼게요. 지금처럼 꾸준히 오시면 돼요.');
  await page.getByRole('button', { name: '검토 완료 · 회원에게 공개' }).click();
  await expect(page.getByText(/설명을 공개했어요/)).toBeVisible();

  // 6. 회원: 쉬운 설명·이전 비교·읽어주기
  await toMember(page);
  await page.goto('/member/body');
  await expect(page.getByText('이번 측정에서 골격근량이 조금 늘었어요.', { exact: false })).toBeVisible();
  await expect(page.getByText(/이전 대비/).first()).toBeVisible();
  const speak = page.locator('#explain').getByRole('button', { name: '읽어주기' });
  const unsupported = page.locator('#explain').getByText(/읽어주기를 지원하지 않아요/);
  await expect(speak.or(unsupported)).toBeVisible();

  // 7. 제휴몰: 코드 발급·복사·재발급 방지·구매 절차 시연
  await page.getByRole('navigation', { name: '회원 메뉴' }).getByRole('link', { name: '온유 제휴몰' }).click();
  await page.getByRole('link', { name: '데일리 프로틴 밀크 할인코드 받기' }).click();
  await page.getByRole('button', { name: '할인코드 받기' }).click();
  await expect(page.getByText('개인 할인코드가 발급됐어요.')).toBeVisible();
  const code = await page.getByLabel('내 할인코드').inputValue();
  expect(code).toMatch(/^ONYU-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  await page.getByRole('button', { name: '코드 복사' }).click();
  await expect(page.getByText(/코드를 복사했어요|자동 복사가 되지 않았어요/)).toBeVisible();
  await page.getByRole('button', { name: '내 코드 다시 보기' }).click();
  await expect(page.getByText('이미 받은 코드가 있어 같은 코드를 다시 보여드려요.')).toBeVisible();
  expect(await page.getByLabel('내 할인코드').inputValue()).toBe(code);
  await page.getByRole('button', { name: '구매 절차 시연 열기' }).click();
  await expect(page.getByText('구매 절차 시연 화면')).toBeVisible();
  await page.getByLabel('할인코드').fill('ONYU-XXXX-XXXX');
  await page.getByRole('button', { name: '적용' }).click();
  await expect(page.getByText('확인되지 않는 코드예요', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '내가 받은 코드 넣기' }).click();
  await page.getByRole('button', { name: '적용' }).click();
  await expect(page.getByText(/코드가 적용됐어요/)).toBeVisible();
  await expect(page.locator('dd.total')).toHaveText('33,150원');

  // 8. 매니저: 발급·이동 내역
  await toStaff(page);
  await page.getByRole('link', { name: '제휴몰 관리' }).click();
  await expect(page.locator('.ops-card', { hasText: '코드 발급' })).toContainText('2건');
  await expect(page.locator('.ops-card', { hasText: '구매 페이지 이동' })).toContainText('2회');
  await expect(page.getByRole('cell', { name: code })).toBeVisible();

  // 9. 새로고침 후 유지 → 초기화로 발표 시작 상태 복원
  await page.reload();
  await expect(page.getByRole('cell', { name: code })).toBeVisible();
  await page.getByRole('link', { name: '시연 설정' }).click();
  await page.getByRole('button', { name: '시연 초기화' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '네, 초기화할게요' }).click();
  await expect(page.getByText(/발표 시작 상태로 되돌렸어요/)).toBeVisible();
  await page.getByRole('link', { name: '제휴몰 관리' }).click();
  await expect(page.locator('.ops-card', { hasText: '코드 발급' })).toContainText('1건');
  await expect(page.getByRole('cell', { name: code })).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('대기 신청 → 취소로 자리 발생 → 대기자가 확정', async ({ page }) => {
  await page.goto('/member');
  // 대표 회원이 마감 수업(다음 평일 09:15)에 대기 신청
  await page.goto('/member/book?date=2026-11-26');
  await page.getByRole('button', { name: '09:15 수업 대기 신청' }).click();
  await expect(page.getByText(/대기 신청이 완료됐어요/)).toBeVisible();
  // 다른 가상 회원(최민수)이 예약 취소
  await (await demoBar(page)).getByLabel('가상 회원').selectOption('mb03');
  await page.goto('/member/me');
  await page.locator('li.panel', { hasText: '11월 26일 (목) 09:15' }).getByRole('button', { name: '예약 취소' }).click();
  await page.getByRole('button', { name: '네, 취소할게요' }).click();
  await expect(page.getByText('예약을 취소했어요.')).toBeVisible();
  // 대표 회원 홈: 자동 확정 아님, 확정 버튼 제공
  await (await demoBar(page)).getByLabel('가상 회원').selectOption('mb01');
  await page.goto('/member');
  await expect(page.getByRole('heading', { name: '대기하신 수업에 자리가 생겼어요' })).toBeVisible();
  await page.getByRole('button', { name: '예약 확정하기' }).click();
  await expect(page.getByText('대기하던 수업의 예약이 확정됐어요.')).toBeVisible();
});

test('만료 회원·체험 회원의 쿠폰 제한, 휴회 회원 예약 제한', async ({ page }) => {
  await page.goto('/member');
  const bar = await demoBar(page);
  await bar.getByLabel('가상 회원').selectOption('mb06');
  await page.goto('/member/mall/pd1');
  await expect(page.getByText(/회원권이 만료되어/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '할인코드 받기' })).toBeDisabled();
  await bar.getByLabel('가상 회원').selectOption('mb04');
  await page.goto('/member/mall/pd1');
  await expect(page.getByText(/유료 회원권\(1개월·3개월\)을 이용 중인 회원/).first()).toBeVisible();
  await bar.getByLabel('가상 회원').selectOption('mb07');
  await page.goto('/member/book?date=2026-11-27');
  await expect(page.getByText(/휴회 기간/).first()).toBeVisible();
});

test('손상된 저장 데이터는 복구 안내 후 정상 동작', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('onyu:demo:v1', '{not json'));
  await page.goto('/member');
  await expect(page.getByText(/처음 상태로 복구했어요/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /님, 안녕하세요/ })).toBeVisible();
});
