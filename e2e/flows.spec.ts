import { expect, test, type Page } from '@playwright/test';

async function fillProfile(page: Page, interests: string[]) {
  await page.goto('/#/start');
  for (const label of interests) await page.getByRole('checkbox', { name: label, exact: true }).check();
  await page.getByRole('button', { name: '2주 전체' }).click();
  await page.getByRole('checkbox', { name: /오전/ }).check();
}

async function answer(page: Page, label: string) {
  await page.getByRole('radio', { name: new RegExp(`^${label}`) }).check();
}

async function readScores(page: Page): Promise<number[]> {
  const texts = await page.locator('.group-card .score-pill strong').allTextContents();
  return texts.map(Number);
}

test('5문항 완료 전에는 결과가 확정되지 않고, 수정한 답이 추천에 반영된다', async ({ page }) => {
  await fillProfile(page, ['전시·미술관', '맛집·카페', '영화']);
  await page.getByRole('button', { name: '다음: 성향 5문항' }).click();
  await expect(page.getByRole('heading', { name: '몇 명이서 함께하는 게 편한가요?' })).toBeVisible();

  // 답하기 전엔 다음으로 넘어갈 수 없다
  await expect(page.getByRole('button', { name: '다음 문항' })).toBeDisabled();
  await answer(page, '4~6명으로 함께');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, '적극적으로 친해지고 싶음');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, '여러 곳을 알차게 방문');
  // 이전 문항으로 돌아가기
  await page.getByRole('button', { name: '이전 문항' }).click();
  await expect(page.getByRole('radio', { name: /^적극적으로 친해지고 싶음/ })).toBeChecked();
  await page.getByRole('button', { name: '다음 문항' }).click();
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, '시간과 동선을 구체적으로 결정');
  // 5번을 답하지 않고 5번 문항으로 이동 후 확정 시도 → 실패
  await page.getByRole('button', { name: '5번 지출 성향' }).click();
  await page.getByRole('button', { name: '결과 확정하기' }).click();
  await expect(page.getByRole('alert')).toContainText('아직 답하지 않은 문항이 1개');
  await page.goto('/#/result');
  await expect(page.getByRole('heading', { name: '아직 결과가 확정되지 않았어요' })).toBeVisible();

  await page.goto('/#/test');
  await answer(page, '마음에 드는 경험에 추가 지출 가능');
  await page.getByRole('button', { name: '결과 확정하기' }).click();
  await expect(page.getByRole('heading', { name: '나의 동행 선호 프로필' })).toBeVisible();
  await expect(page.locator('.axis-list')).toContainText('4~6명으로 함께');

  const before = await readScores(page);
  expect(before.length).toBeGreaterThan(0);
  expect([...before].sort((a, b) => b - a)).toEqual(before); // 근접도 내림차순
  const firstTitleBefore = await page.locator('.group-card .gc-title').first().textContent();

  // 결과 수정: 모든 문항을 반대로 바꾸면 추천 순서/점수가 바뀐다
  await page.getByRole('button', { name: '결과 수정' }).click();
  await expect(page.getByText('결과 수정 중이에요')).toBeVisible();
  await answer(page, '2~3명으로 소규모');
  for (const [i, label] of [[2, '자연스럽게 대화'], [3, '천천히 여유롭게'], [4, '핵심 일정만 사전 결정'], [5, '정한 예산 안에서']] as const) {
    await page.getByRole('button', { name: new RegExp(`^${i}번`) }).click();
    await answer(page, label);
  }
  await page.getByRole('button', { name: '결과 확정하기' }).click();
  await expect(page.locator('.axis-list')).toContainText('2~3명으로 소규모');
  const after = await readScores(page);
  expect([...after].sort((a, b) => b - a)).toEqual(after);
  const firstTitleAfter = await page.locator('.group-card .gc-title').first().textContent();
  expect(after.join(',') !== before.join(',') || firstTitleAfter !== firstTitleBefore).toBe(true);
  // 점수 표기는 ‘성향 근접도 N/100’ 형식
  await expect(page.locator('.score-pill').first()).toHaveText(/성향 근접도 \d+\/100/);
  await expect(page.getByText(/매칭 성공 확률|만족도 \d+%/)).toHaveCount(0);

  // 새로고침해도 유지
  await page.reload();
  await expect(page.locator('.axis-list')).toContainText('2~3명으로 소규모');
});

test('조건에 맞는 그룹이 없으면 조정 방법을 안내한다', async ({ page }) => {
  await fillProfile(page, ['야구 직관']);
  // 예산 0원
  const slider = page.getByRole('slider', { name: /1인 예산 상한/ });
  await slider.focus();
  await page.keyboard.press('Home');
  await page.getByRole('button', { name: '다음: 성향 5문항' }).click();
  for (let i = 0; i < 5; i++) {
    await page.locator('.q-option').nth(1).click();
    if (i < 4) await page.getByRole('button', { name: '다음 문항' }).click();
  }
  await page.getByRole('button', { name: '결과 확정하기' }).click();
  await expect(page.getByRole('heading', { name: '지금 조건에 맞는 그룹이 없어요' })).toBeVisible();
  await expect(page.getByText('예산 상한을 조금 올려 보세요.')).toBeVisible();
});

test('둘러보기: 활동·날짜·예산 필터', async ({ page }) => {
  await page.goto('/#/explore');
  const total = await page.locator('.group-card').count();
  expect(total).toBeGreaterThanOrEqual(12);

  await page.getByRole('button', { name: '야구 직관', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('야구 직관');
  const cats = await page.locator('.group-card .gc-cat').allTextContents();
  expect(cats.length).toBeGreaterThan(0);
  expect(cats.every((c) => c === '야구')).toBe(true);

  await page.getByRole('button', { name: '전체', exact: true }).click();
  await page.getByLabel('1인 예산').selectOption('10000');
  const costs = await page.locator('.group-card .gc-cost').allTextContents();
  expect(costs.length).toBeGreaterThan(0);
  for (const c of costs) {
    const n = c.includes('비용 없음') ? 0 : Number(c.match(/약 ([\d,]+)원/)![1].replace(/,/g, ''));
    expect(n).toBeLessThanOrEqual(10000);
  }

  await page.getByLabel('1인 예산').selectOption('');
  // 첫 그룹의 날짜로 필터
  const dateChip = page.locator('.date-chip').nth(4);
  const label = (await dateChip.getAttribute('aria-label'))!; // 예: 10/10 토요일
  await dateChip.click();
  const md = label.split(' ')[0].split('/');
  const dates = await page.locator('.group-card .gc-meta dd').filter({ hasText: '월' }).allTextContents();
  for (const d of dates) expect(d).toContain(`${md[0]}월 ${md[1]}일`);
});

test('역매칭: 동의자만 후보, 중복 초대 방지, 수락 시 정원 반영, 초과 수락 차단', async ({ page }) => {
  await page.goto('/#/host?group=g01');
  const cands = page.locator('.cand-card');
  await expect(cands).toHaveCount(2);
  await expect(page.locator('.cand-list')).not.toContainText('느긋한고양이'); // 비동의자
  await expect(page.locator('.cand-list')).not.toContainText('새벽러닝'); // 비동의자

  // 첫 번째 초대
  await cands.filter({ hasText: '오늘도직관' }).getByRole('button', { name: '초대하기' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '초대 보내기' }).click();
  await expect(dialog).toBeHidden();
  // 초대한 사람은 후보에서 빠져 중복 초대 불가
  await expect(page.locator('.cand-list')).not.toContainText('오늘도직관');
  await expect(page.locator('.inv-list')).toContainText('응답 대기');

  await cands.filter({ hasText: '첫직관' }).getByRole('button', { name: '초대하기' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '초대 보내기' }).click();
  await expect(page.locator('.inv-row')).toHaveCount(2);

  // 참여자 화면: 오늘도직관 수락 → 정원(3) 도달
  await page.locator('.inv-row').filter({ hasText: '오늘도직관' }).getByRole('link', { name: '참여자 화면에서 보기' }).click();
  await expect(page.getByLabel('누구의 화면으로 볼까요?')).toHaveValue('p07');
  await page.getByRole('button', { name: '수락하기' }).click();
  await expect(page.locator('.invite-card .status')).toHaveText('수락함 · 참여 확정');

  // 첫직관은 정원 초과로 수락 불가
  await page.getByLabel('누구의 화면으로 볼까요?').selectOption('p14');
  await expect(page.getByText('정원이 모두 차서 지금은 수락할 수 없어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '수락하기' })).toBeDisabled();

  // 상세에 멤버 반영
  await page.goto('/#/groups/g01');
  await expect(page.locator('.member-list')).toContainText('오늘도직관');
  await expect(page.locator('.ac-seats')).toHaveText('모집 마감');

  // 호스트 화면: 정원 찼다는 안내
  await page.goto('/#/host?group=g01');
  await expect(page.getByText('정원이 모두 찼어요. 더 초대할 수 없어요.')).toBeVisible();
});

test('역매칭: 거절·초대 취소 후 상태 일관성', async ({ page }) => {
  await page.goto('/#/host?group=g05');
  const names = await page.locator('.cand-card .cand-id strong').allTextContents();
  expect(names.length).toBeGreaterThanOrEqual(2);
  const [a, b] = names;
  for (const n of [a, b]) {
    await page.locator('.cand-card').filter({ hasText: n }).getByRole('button', { name: '초대하기' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '초대 보내기' }).click();
  }
  // a 초대 취소 → 후보로 복귀
  await page.locator('.inv-row').filter({ hasText: a }).getByRole('button', { name: '초대 취소' }).click();
  await expect(page.locator('.inv-row').filter({ hasText: a })).toContainText('초대 취소됨');
  await expect(page.locator('.cand-list')).toContainText(a);

  // b 거절 → 후보에서 계속 제외, 멤버 수 변화 없음
  await page.locator('.inv-row').filter({ hasText: b }).getByRole('link', { name: '참여자 화면에서 보기' }).click();
  await page.getByRole('button', { name: '거절하기' }).click();
  await expect(page.locator('.invite-card .status')).toHaveText('거절함');
  await expect(page.getByRole('button', { name: '수락하기' })).toHaveCount(0);
  await page.goto('/#/host?group=g05');
  await expect(page.locator('.inv-row').filter({ hasText: b })).toContainText('거절함');
  await expect(page.locator('.cand-list')).not.toContainText(b);
  await expect(page.locator('form, .summary-grid').first()).toContainText('1/3명');
});

test('내 프로필은 역매칭 공개에 동의해야 후보가 된다', async ({ page }) => {
  await fillProfile(page, ['야구 직관']);
  await page.getByRole('radio', { name: '서울 연고팀' }).check();
  await page.getByRole('button', { name: '다음: 성향 5문항' }).click();
  for (let i = 0; i < 5; i++) {
    await page.locator('.q-option').nth(1).click();
    if (i < 4) await page.getByRole('button', { name: '다음 문항' }).click();
  }
  await page.getByRole('button', { name: '결과 확정하기' }).click();
  await page.goto('/#/host?group=g01');
  await expect(page.locator('.cand-list')).not.toContainText('내 프로필');
  await page.goto('/#/result');
  await page.locator('.switch-row').click();
  await expect(page.getByRole('switch')).toBeChecked();
  await page.goto('/#/host?group=g01');
  await expect(page.locator('.cand-list')).toContainText('내 프로필');
});

test('신고·차단·차단 해제', async ({ page }) => {
  await page.goto('/#/groups/g10');
  // 그룹 신고
  await page.getByRole('button', { name: '그룹 신고' }).click();
  const dialog = page.getByRole('dialog', { name: '그룹 신고' });
  await dialog.getByRole('button', { name: '신고 기록 남기기' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('신고 사유를 선택해 주세요.');
  await dialog.getByRole('radio', { name: '금전 요구·영리 목적 홍보' }).check();
  await dialog.getByLabel(/추가 설명/).fill('<b>테스트</b> 설명');
  await dialog.getByRole('button', { name: '신고 기록 남기기' }).click();
  await expect(dialog).toBeHidden();

  // 호스트 차단 → 둘러보기에서 사라짐
  await page.getByRole('button', { name: '회원 차단' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '차단하기' }).click();
  await expect(page.getByRole('heading', { name: '차단한 그룹이에요' })).toBeVisible();
  await page.goto('/#/explore?cat=food');
  await expect(page.locator('.group-card')).not.toContainText('성수 디저트 카페 웨이팅 같이');

  await page.goto('/#/records');
  await expect(page.getByText('처리 상태: 미전송 (이 브라우저에만 기록)')).toBeVisible();
  await expect(page.getByText('<b>테스트</b> 설명')).toBeVisible(); // 텍스트 그대로 표시
  await expect(page.locator('main .inv-row').filter({ hasText: '접수 완료' })).toHaveCount(0);
  await page.getByRole('button', { name: '차단 해제' }).click();
  await page.goto('/#/explore?cat=food');
  await expect(page.locator('.group-card').filter({ hasText: '성수 디저트 카페 웨이팅 같이' })).toHaveCount(1);
});

test('사용자 입력이 HTML·스크립트로 실행되지 않는다 (그룹 생성 반영 포함)', async ({ page }) => {
  const payload = '<img src=x onerror="window.__xss=1">파티';
  await page.goto('/#/create');
  await page.getByRole('radio', { name: '전시·미술관' }).check();
  await page.getByLabel('제목').fill(payload);
  await page.getByLabel('활동 설명').fill('<script>window.__xss=2</script> 천천히 보는 전시 모임');
  await page.getByLabel('활동 장소').fill('종로');
  await page.getByLabel('첫 만남 장소 (공개 장소)').fill('역 1번 출구 앞');
  await page.getByLabel('해산 계획').fill('로비에서 해산');
  await page.getByRole('radio', { name: '천천히 오래' }).check();
  await page.getByRole('radio', { name: '관람 후 이야기' }).first().check();
  await page.getByRole('button', { name: '그룹 만들기' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(payload);
  await expect(page.locator('.detail-desc')).toContainText('<script>');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await page.locator('.detail-head img').count()).toBe(0);

  // 둘러보기와 역매칭에 반영
  await page.goto('/#/explore?cat=exhibition');
  await expect(page.locator('.group-card').filter({ hasText: '파티' })).toHaveCount(1);
  await page.goto('/#/host');
  await expect(page.getByLabel('내 그룹 선택').locator('option').first()).toContainText('[내 그룹]');
  await expect(page.locator('.cand-list')).toContainText('소금빵');
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('그룹 생성 필수 항목 검증', async ({ page }) => {
  await page.goto('/#/create');
  await page.getByRole('button', { name: '그룹 만들기' }).click();
  await expect(page.getByText('제목을 4자 이상 입력해 주세요.')).toBeVisible();
  await expect(page.getByText('공개된 첫 만남 장소를 입력해 주세요.')).toBeVisible();
  await expect(page.getByLabel('제목')).toBeFocused();
});

test('참여 요청·저장이 내 동행에 반영되고 실제 전송처럼 표시하지 않는다', async ({ page }) => {
  await page.goto('/#/groups/g05');
  await page.locator('.mobile-cta').getByRole('button', { name: '참여 요청' }).click();
  const dialog = page.getByRole('dialog', { name: '참여 요청' });
  await dialog.getByRole('button', { name: '참여 요청 남기기' }).click();
  await expect(dialog.getByRole('alert')).toContainText('안내 사항');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: '참여 요청 남기기' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await page.goto('/#/me');
  await expect(page.locator('.inv-list')).toContainText('호스트에게 전송되지 않음');
  await page.getByRole('tab', { name: /저장/ }).click();
  await expect(page.locator('.group-card')).toContainText('조용히 오래 보는 전시 산책');
});

test('대학생 인증 체험: 승인 도메인·코드 검증, 실제 인증으로 표시하지 않음', async ({ page }) => {
  await page.goto('/#/safety');
  await page.getByRole('radio', { name: '누리대학교(가상)' }).check();
  await page.getByLabel(/학교 이메일/).fill('someone@gmail.com');
  await page.getByRole('button', { name: /인증 코드 받기/ }).click();
  await expect(page.getByRole('alert')).toContainText('@ 앞부분만');
  await page.getByLabel(/학교 이메일/).fill('test01');
  await page.getByRole('button', { name: /인증 코드 받기/ }).click();
  const inbox = page.getByRole('region', { name: '체험용 메일함' });
  await expect(inbox).toContainText('test01@nuri.ac.example');
  const code = (await inbox.locator('.mi-code').textContent())!;
  await page.getByLabel('3. 인증 코드 6자리').fill(code === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('alert')).toContainText('코드가 맞지 않아요');
  await page.getByLabel('3. 인증 코드 6자리').fill(code);
  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.getByText('체험 완료 · 실제 인증 아님')).toBeVisible();
  // 이메일 주소는 저장되지 않는다
  const stored = await page.evaluate(() => localStorage.getItem('daymate:prototype:v1') ?? '');
  expect(stored).not.toContain('test01');
});
