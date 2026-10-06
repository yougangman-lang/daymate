import { expect, test } from '@playwright/test';

// vite preview는 Vercel rewrites처럼 모르는 경로에 index.html을 돌려준다.
const CASES: [string, string, RegExp][] = [
  ['/explore', '#/explore', /모든 활동/],
  ['/groups/g01', '#/groups/g01', /평일 저녁 야구 직관/],
  ['/explore?cat=food', '#/explore?cat=food', /맛집·카페/],
  ['/safety', '#/safety', /처음 만나는 동행/],
];

for (const [path, hash, heading] of CASES) {
  test(`경로 직접 접속·새로고침: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`${hash.replace(/[?]/g, '\\?')}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    expect(errors).toEqual([]);
  });
}

test('해시 주소 직접 접속·새로고침', async ({ page }) => {
  await page.goto('/#/groups/g05');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('조용히 오래 보는 전시 산책');
});
