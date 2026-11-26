// 시설 둘러보기(/facility)와 무료체험 안내(/trial) 검증
import { expect, test } from '@playwright/test';

const FIXED = new Date('2026-11-25T07:30:00+09:00');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED);
});

const map = (page: import('@playwright/test').Page) => page.getByRole('group', { name: '공간 선택' });

test('시작 화면에서 진입 → 공간 선택 → 방문 순서 → 이전으로 시작 화면', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '시설 둘러보기' }).click();
  await expect(page).toHaveURL(/\/facility$/);
  await expect(page.getByRole('heading', { name: '시설 둘러보기', level: 1 })).toBeVisible();
  await expect(page.getByText('시설 구성 예시 · 전용 50평(약 165.3㎡) 계획')).toBeVisible();
  await expect(page.getByText('대학 과제 발표용')).toHaveCount(0);

  // 공간 선택: 색 + '선택됨' 글자
  const fitness = map(page).getByRole('button', { name: /피트니스룸/ });
  await fitness.click();
  await expect(fitness).toHaveAttribute('aria-pressed', 'true');
  await expect(fitness).toContainText('선택됨');
  await expect(page.locator('#onyu-ft-space-title')).toHaveText('피트니스룸');
  await expect(page.getByText('사이클 2대, 로잉 2대, 덤벨 1~10kg')).toBeVisible();
  await expect(page.getByRole('img', { name: '피트니스룸 공간 구성 일러스트' })).toBeVisible();
  await expect(page.getByText('공간 구성 일러스트', { exact: true })).toBeVisible();

  // 키보드로 공간 선택
  await map(page).getByRole('button', { name: /라운지/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#onyu-ft-space-title')).toHaveText('라운지');
  await expect(page.getByText(/자판기 음료는 별도 구매/)).toBeVisible();

  // 첫 방문 순서: 처음 → 다음 … → 마지막에서 처음부터 보기
  await map(page).getByRole('button', { name: /접수/ }).click();
  const status = page.locator('.onyu-ft-tour [role="status"]');
  await expect(status).toHaveText('1 / 5 · 접수');
  await expect(page.getByRole('button', { name: '이전 공간' })).toBeDisabled();
  for (const [i, name] of ['측정·상담실', '피트니스룸', '라운지', '샤워·탈의실'].entries()) {
    await page.getByRole('button', { name: '다음 공간' }).click();
    await expect(status).toHaveText(`${i + 2} / 5 · ${name}`);
  }
  await page.getByRole('button', { name: '이전 공간' }).click();
  await expect(status).toHaveText('4 / 5 · 라운지');
  await page.getByRole('button', { name: '다음 공간' }).click();
  await page.getByRole('button', { name: '처음부터 보기' }).click();
  await expect(status).toHaveText('1 / 5 · 접수');

  // 창고 선택 후 방문 순서 시작
  await map(page).getByRole('button', { name: /창고/ }).click();
  await expect(status).toContainText('창고를 보고 있어요');
  await page.getByRole('button', { name: '방문 순서 시작' }).click();
  await expect(status).toHaveText('1 / 5 · 접수');

  // 읽어주기 (기존 컴포넌트) 또는 미지원 안내
  const speak = page.locator('#onyu-ft-detail').getByRole('button', { name: '읽어주기' });
  await expect(speak.or(page.locator('#onyu-ft-detail').getByText(/읽어주기를 지원하지 않아요/))).toBeVisible();

  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '회원 화면으로 시작하기' })).toBeVisible();
});

test('회원 홈에서 진입 → 무료체험 안내 → 이전으로 시설 → 이전으로 회원 홈', async ({ page }) => {
  await page.goto('/member');
  await expect(page.getByRole('navigation', { name: '회원 메뉴' }).getByRole('link')).toHaveCount(5);
  await page.getByRole('link', { name: '시설 둘러보기' }).click();
  await expect(page).toHaveURL(/\/facility$/);
  await page.getByRole('button', { name: '무료체험 알아보기' }).click();
  await expect(page).toHaveURL(/\/trial$/);
  await expect(page.getByRole('heading', { name: '무료체험 안내' })).toBeVisible();
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/facility$/);
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/member$/);
});

test('비회원 무료체험 안내 → 기존 예약 흐름으로 체험 예약', async ({ page }) => {
  await page.goto('/trial');
  await expect(page.getByText(/수업을 2회 무료로 체험/)).toBeVisible();
  await page.getByRole('button', { name: '체험 수업 예약하기' }).click();
  await expect(page).toHaveURL(/\/member\/book$/);
  await expect(page.getByText(/무료체험 2회 중/)).toBeVisible();
});

test('직접 접속·새로고침, 직접 접속 시 이전으로는 시작 화면', async ({ page }) => {
  await page.goto('/facility');
  await map(page).getByRole('button', { name: /샤워·탈의실/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '시설 둘러보기', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('가로 넘침 없음, 버튼 56px 이상, 글씨 크게 상태 포함', async ({ page }) => {
  const vw = page.viewportSize()!.width;
  for (const large of [false, true]) {
    for (const path of ['/facility', '/trial']) {
      await page.goto(path);
      if (large && path === '/facility') await page.getByRole('button', { name: '글씨 크게' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-font', large ? 'large' : 'normal');
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${path} large=${large}`).toBeLessThanOrEqual(vw);
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('main button, main .btn'))
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ t: el.textContent?.trim(), h: el.getBoundingClientRect().height }))
          .filter((x) => x.h < 55.5),
      );
      expect(small, `${path} 버튼 높이`).toEqual([]);
      // 공간 버튼 글자가 버튼 밖으로 잘리지 않음
      const clipped = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.onyu-ft-room')).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
      );
      expect(clipped, `${path} 공간 버튼 잘림`).toEqual([]);
    }
  }
});
