import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/explore', '/start', '/test', '/result', '/groups/g01', '/groups/g07', '/create', '/host', '/invites', '/me', '/safety', '/records'];

for (const route of ROUTES) {
  test(`가로 넘침 없음: ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/#${route}`);
    await page.waitForLoadState('networkidle');
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw).toBeLessThanOrEqual(cw);
    // 주요 버튼은 터치하기 충분한 높이
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('main .btn:not(.btn-sm), .tab, .gc-save'))
        .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height < 40)
        .map((el) => el.textContent),
    );
    expect(small).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('모달: 화면 안에 들어오고, Esc로 닫히며, 포커스가 돌아간다', async ({ page }) => {
  await page.goto('/#/groups/g05');
  const trigger = page.getByRole('button', { name: '그룹 신고' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const vp = page.viewportSize()!;
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
  // 제출 버튼이 화면 안에 보인다
  await expect(dialog.getByRole('button', { name: '신고 기록 남기기' })).toBeInViewport();
  // 포커스는 모달 안에 머문다
  for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('키보드만으로 테스트 문항 선택', async ({ page }) => {
  await page.goto('/#/test');
  const first = page.getByRole('radio', { name: /^2~3명으로 소규모/ });
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /^상관없음/ })).toBeChecked();
});
