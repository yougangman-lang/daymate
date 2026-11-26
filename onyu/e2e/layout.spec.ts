// 가로 넘침, 터치 영역, 하단 메뉴 가림, 직접 접속·새로고침, 모달 포커스를 확인한다.
import { expect, test } from '@playwright/test';

const FIXED = new Date('2026-11-25T07:30:00+09:00');
const MEMBER = ['/member', '/member/book', '/member/book?date=2026-11-26', '/member/body', '/member/body/report', '/member/mall', '/member/mall/pd1', '/member/mall/pd1/purchase', '/member/me', '/member/me/help'];
const STAFF = ['/staff', '/staff/classes', '/staff/classes/s-20261125-0915', '/staff/members', '/staff/members/mb01', '/staff/measurements', '/staff/feedback', '/staff/mall', '/staff/inquiries', '/staff/demo'];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED);
});

test('회원 화면: 가로 넘침 없음, 주요 버튼 56px 이상, 하단 메뉴가 내용을 가리지 않음', async ({ page }) => {
  const vw = page.viewportSize()!.width;
  for (const path of MEMBER) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${path} 가로 넘침`).toBeLessThanOrEqual(vw);
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('main .btn:not(.btn-sm)'))
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ t: el.textContent?.trim(), h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 55.5),
    );
    expect(small, `${path} 56px 미만 버튼`).toEqual([]);
    // 맨 아래로 스크롤했을 때 마지막 요소가 하단 메뉴 위에 있음
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const covered = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const last = main.lastElementChild as HTMLElement;
      const bar = document.querySelector('.tabbar')!.getBoundingClientRect();
      return last.getBoundingClientRect().bottom > bar.top + 1;
    });
    expect(covered, `${path} 하단 메뉴 가림`).toBe(false);
  }
});

test('운영진 화면: 가로 넘침 없음', async ({ page }) => {
  const vw = page.viewportSize()!.width;
  await page.goto('/');
  await page.getByRole('button', { name: '운영진(매니저·코치) 화면 보기' }).click();
  for (const path of STAFF) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${path} 가로 넘침`).toBeLessThanOrEqual(vw);
  }
});

test('글씨 크게 설정 시에도 넘침 없음, 설정 유지', async ({ page }) => {
  const vw = page.viewportSize()!.width;
  await page.goto('/member');
  await page.getByRole('button', { name: '글씨 크게' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-font', 'large');
  for (const path of ['/member', '/member/book?date=2026-11-26', '/member/body', '/member/mall']) {
    await page.goto(path);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, `${path} 큰 글씨 가로 넘침`).toBeLessThanOrEqual(vw);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-font', 'large');
});

test('경로 직접 접속·새로고침, 로고는 역할 홈으로', async ({ page }) => {
  await page.goto('/member/body/report');
  await expect(page.getByRole('heading', { name: '자세한 결과 보기' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '자세한 결과 보기' })).toBeVisible();
  await page.getByRole('link', { name: '온유 회원 홈으로' }).click();
  await expect(page).toHaveURL(/\/member$/);
});

test('모달: 포커스 이동·Esc 닫기·포커스 복귀', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '운영진(매니저·코치) 화면 보기' }).click();
  await page.goto('/staff/demo');
  const opener = page.getByRole('button', { name: '시연 초기화' });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '아니요, 돌아갈게요' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
