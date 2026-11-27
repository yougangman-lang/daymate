// 코치 소개(/coaches, /member/coaches) 검증
import { expect, test, type Page } from '@playwright/test';

const FIXED = new Date('2026-11-25T07:30:00+09:00');
const ORDER = ['이현석', '정연태', '변지원', '기윤재'];
const FILES = ['lee-hyeonseok', 'jeong-yeontae', 'byun-jiwon', 'gi-yunjae'];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED);
});

/** 사진 4장이 모두 실제로 로드되고, 비율 그대로(잘림 없이) 표시되며, 이름 글씨가 카드 밖으로 넘치지 않는지 */
async function expectCardsIntact(page: Page) {
  const cards = page.locator('.coach-card');
  await expect(cards).toHaveCount(4);
  await expect(page.locator('.coach-card h2')).toHaveText(ORDER);
  for (let i = 0; i < 4; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    const img = card.getByRole('img', { name: `${ORDER[i]} 코치 프로필` });
    await expect(img).toHaveAttribute('src', `/images/coaches/${FILES[i]}.png`);
    await expect(img).toHaveAttribute('loading', i === 0 ? 'eager' : 'lazy');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(1086);
    const m = await img.evaluate((el: HTMLImageElement) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const c = el.closest('.coach-card')!.getBoundingClientRect();
      return { w: r.width, h: r.height, fit: cs.objectFit, cw: c.width, left: r.left, right: r.right, cl: c.left, cr: c.right };
    });
    expect(Math.abs(m.h - (m.w * 1448) / 1086)).toBeLessThan(1.5); // 원본 비율 = 상단 글씨·하단 이름 포함 전체
    expect(m.fit).toBe('fill');
    expect(m.left).toBeGreaterThanOrEqual(m.cl - 0.5);
    expect(m.right).toBeLessThanOrEqual(m.cr + 0.5);
    for (const sel of ['h2', '.coach-role']) {
      const t = card.locator(sel);
      await expect(t).toBeVisible();
      expect(await t.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    await expect(card.locator('.coach-role')).toHaveText('온유 코치');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

/** 예약 정보: 담당 코치 2명(가상 코치, 서로 다름)과 수업 매니저 1명(코치 소개 인물)을 구분해 표시 */
async function expectRoles(dl: import('@playwright/test').Locator, managerName: string) {
  const coachText = (await dl.locator('dt:text-is("담당 코치") + dd').textContent())!.trim();
  const coaches = coachText.split(' · ');
  expect(coaches).toHaveLength(2);
  expect(new Set(coaches).size).toBe(2);
  for (const c of coaches) expect(ORDER).not.toContain(c);
  await expect(dl.locator('dt:text-is("수업 매니저") + dd')).toHaveText(managerName);
  await expect(dl).not.toContainText('온유 코치');
  // 링크는 수업 매니저 1개뿐: 가상 코치 이름은 일반 텍스트
  await expect(dl.locator('dt:text-is("담당 코치") + dd a')).toHaveCount(0);
  const links = dl.getByRole('link');
  await expect(links).toHaveCount(1);
  await expect(links).toHaveText(managerName);
  // 연결 주소가 같은 인물의 카드(사진 파일 이름)를 가리킨다
  const file = FILES[ORDER.indexOf(managerName)];
  await expect(links).toHaveAttribute('href', `/member/coaches#coach-${file}`);
}

test('시작 화면 → 코치 소개(공개) → 글씨 크게 → 이전으로 시작 화면', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: '코치 소개' }).click();
  await expect(page).toHaveURL(/\/coaches$/);
  await expect(page.getByRole('heading', { name: '함께 움직일 온유 코치진', level: 1 })).toBeVisible();
  await expect(page.getByText('수업에서 함께할 코치들을 만나보세요.')).toBeVisible();
  await expectCardsIntact(page);

  // 휴대전화 1열, 넓은 화면 2열
  const xs = await page.locator('.coach-card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(xs).size).toBe(info.project.name === 'mobile' ? 1 : 2);

  await page.getByRole('button', { name: '글씨 크게' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-font', 'large');
  await expectCardsIntact(page);
  for (const name of ['이전으로', '처음으로', '글씨 보통']) {
    const box = await page.getByRole(name === '처음으로' ? 'link' : 'button', { name }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(56);
  }

  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('회원 홈 → 코치 소개: 5개 탭 유지, 시설 둘러보기 옆 버튼, 이전으로 회원 홈', async ({ page }) => {
  await page.goto('/member');
  const tabs = page.getByRole('navigation', { name: '회원 메뉴' }).getByRole('link');
  await expect(tabs).toHaveCount(5);
  const facility = page.getByRole('link', { name: '시설 둘러보기' });
  const coaches = page.getByRole('link', { name: '코치 소개', exact: true });
  const [fb, cb] = [await facility.boundingBox(), await coaches.boundingBox()];
  expect(cb!.y - (fb!.y + fb!.height)).toBeLessThan(40);
  expect(cb!.height).toBeGreaterThanOrEqual(56);

  await coaches.click();
  await expect(page).toHaveURL(/\/member\/coaches$/);
  await expect(tabs).toHaveCount(5);
  await expect(page.getByRole('link', { name: '도움 요청' })).toBeVisible();
  await page.getByRole('button', { name: '글씨 크게' }).click();
  await expectCardsIntact(page);
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/member$/);
});

test('예약 화면의 수업 매니저 → 같은 인물의 코치 소개, 새로고침·이전으로', async ({ page }) => {
  // 회원 홈 다음 예약
  await page.goto('/member');
  const kv = page.locator('.next-card dl');
  const homeLink = kv.getByRole('link', { name: /소개 보기$/ });
  const homeName = (await homeLink.textContent())!.trim();
  expect(ORDER).toContain(homeName);
  await expectRoles(kv, homeName);
  await homeLink.click();
  await expect(page).toHaveURL(/\/member\/coaches#coach-/);
  const target = page.locator('.coach-card.is-target');
  await expect(target).toHaveCount(1);
  await expect(target.locator('h2')).toHaveText(homeName);
  await expect(target.getByRole('img')).toHaveAttribute('alt', `${homeName} 코치 프로필`);
  await expect(target).toBeInViewport();

  // 새로고침해도 같은 인물 표시
  await page.reload();
  await expect(page.locator('.coach-card.is-target h2')).toHaveText(homeName);
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/member$/);

  // 예약 확인 화면
  await page.goto('/member/book?date=2026-11-25');
  await page.getByRole('link', { name: /^10:30 .* 선택$/ }).click();
  await expect(page.getByRole('heading', { name: '예약 내용을 확인해 주세요' })).toBeVisible();
  const confirmUrl = page.url();
  const link = page.locator('dl.kv').getByRole('link', { name: /소개 보기$/ });
  const name = (await link.textContent())!.trim();
  await expectRoles(page.locator('dl.kv'), name);
  await link.click();
  await expect(page.locator('.coach-card.is-target h2')).toHaveText(name);
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(confirmUrl);
  await expect(page.getByRole('heading', { name: '예약 내용을 확인해 주세요' })).toBeVisible();
});

test('직접 주소 접속·새로고침', async ({ page }) => {
  await page.goto('/coaches');
  await expectCardsIntact(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '함께 움직일 온유 코치진' })).toBeVisible();
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/member/coaches#coach-gi-yunjae');
  await expect(page.locator('#coach-gi-yunjae')).toBeInViewport();
  await page.getByRole('button', { name: '이전으로' }).click();
  await expect(page).toHaveURL(/\/member$/);

  const res = await page.request.get('/images/coaches/byun-jiwon.png');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
});

test('네 명의 수업 매니저 모두 자기 카드로 연결, 가상 코치는 링크 없음', async ({ page }) => {
  // 날짜·시간대별로 수업 매니저가 교대로 바뀌므로 확인 화면을 여러 개 열어 네 명을 모두 확인한다
  const seen = new Set<string>();
  for (const date of ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-30']) {
    await page.goto(`/member/book?date=${date}`);
    const hrefs = await page.getByRole('link', { name: / 선택$/ }).evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    for (const href of hrefs) {
      if (seen.size === 4) break;
      await page.goto(href);
      const dl = page.locator('dl.kv');
      const name = (await dl.locator('dt:text-is("수업 매니저") + dd').textContent())!.trim();
      if (seen.has(name)) continue;
      await expectRoles(dl, name);
      await dl.getByRole('link', { name }).click();
      const target = page.locator('.coach-card.is-target');
      await expect(target.locator('h2')).toHaveText(name);
      await expect(target.getByRole('img')).toHaveAttribute('src', `/images/coaches/${FILES[ORDER.indexOf(name)]}.png`);
      seen.add(name);
    }
  }
  expect([...seen].sort()).toEqual([...ORDER].sort());
});

test('기존 저장 데이터의 매니저 문구 알림이 화면에서도 새 문구로 표시', async ({ page }) => {
  await page.goto('/member');
  await page.evaluate(() => {
    const key = 'onyu:demo:v1';
    const s = JSON.parse(localStorage.getItem(key)!);
    for (const n of s.notifications) if (n.id === 'nt-seed-3') n.body = '쉬운 설명은 매니저가 확인한 뒤 알려드려요.';
    s.demo.memberId = s.notifications.find((n: { id: string }) => n.id === 'nt-seed-3').memberId;
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByText('쉬운 설명은 온유 담당자가 확인한 뒤 알려드려요.')).toBeVisible();
  await expect(page.getByText(/매니저가 확인한 뒤/)).toHaveCount(0);
  await expect(page.getByText(/저장된 시연 데이터를 읽을 수 없어|형식이 바뀌어/)).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('onyu:demo:v1')!).notifications.find((n: { id: string }) => n.id === 'nt-seed-3'));
  expect(stored.body).toBe('쉬운 설명은 온유 담당자가 확인한 뒤 알려드려요.');
  expect(stored.read).toBe(false);
});

