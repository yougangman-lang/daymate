// 실제 온유 앱(onyu/ 빌드 결과)을 브라우저에서 조작하며 단계별 화면을 캡처한다.
// - 가상 시연 데이터만 사용, 상태는 이 캡처용 브라우저의 localStorage 안에서만 바뀐다(운영 데이터 무관).
// - 기준 시각 2026-11-25(수) 07:30 KST 고정 (onyu/e2e/demo-flow.spec.ts 와 같은 절차).
// - 결과: public/app/<id>.png (430x932 CSS px, 3배 해상도) + public/app/manifest.json (강조할 요소의 CSS px 좌표)
// 사용: (onyu/에서) npm run build && npx vite preview --port 4173 를 띄운 뒤
//       BASE=http://localhost:4173 node scripts/capture.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.join(__dirname, '..', 'public', 'app');
const FIXED = new Date('2026-11-25T07:30:00+09:00');
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(FIXED);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 캡처 시 커서 깜빡임·전환 애니메이션 제거
  const calm = () => page.addStyleTag({ content: '*{caret-color:transparent!important;transition:none!important;animation:none!important;scroll-behavior:auto!important}' });

  /** 대상 요소를 화면 중앙 근처로 스크롤한 뒤 뷰포트를 캡처하고, 강조 요소들의 좌표를 저장 */
  async function shot(id, { focus, boxes = {}, top = false, offset = 0 } = {}) {
    await calm();
    if (top) await page.evaluate(() => window.scrollTo(0, 0));
    else if (focus) {
      const el = typeof focus === 'string' ? page.locator(focus).first() : focus;
      await el.scrollIntoViewIfNeeded();
      await el.evaluate((n, off) => {
        const r = n.getBoundingClientRect();
        window.scrollBy(0, r.top - window.innerHeight * 0.3 + off);
      }, offset);
    }
    await page.waitForTimeout(250);
    const out = {};
    for (const [k, loc] of Object.entries(boxes)) {
      const el = typeof loc === 'string' ? page.locator(loc).first() : loc;
      const b = await el.boundingBox();
      if (b) out[k] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      else console.warn(`[${id}] box ${k} not visible`);
    }
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
    manifest[id] = { file: `app/${id}.png`, w: 430, h: 932, boxes: out, url: page.url().replace(BASE, '') };
    console.log('shot', id, Object.keys(out).join(','));
  }

  const bar = () => page.getByRole('region', { name: '시연 장치' });
  const toStaff = async (kind = '매니저') => {
    await bar().getByRole('button', { name: '매니저 화면' }).click();
    await bar().getByRole('button', { name: kind, exact: true }).click();
  };
  const toMember = async () => bar().getByRole('button', { name: '회원 화면' }).click();

  // ---------- 방문 전: 첫 화면·시설·무료체험 ----------
  await page.goto(BASE + '/');
  await shot('entry', { top: true, boxes: { start: page.getByRole('button', { name: '회원 화면으로 시작하기' }), facility: page.getByRole('button', { name: '시설 둘러보기' }) } });

  await page.goto(BASE + '/facility');
  await shot('facility_map', { top: true, boxes: { map: '.onyu-ft-map', note: '.onyu-ft-note' } });
  for (const [id, name] of [['fitness', '피트니스룸'], ['measure', '측정·상담실'], ['lounge', '라운지'], ['shower', '샤워·탈의실']]) {
    await page.locator('.onyu-ft-map button', { hasText: name }).click();
    await page.waitForTimeout(200);
    await shot(`facility_${id}`, { focus: '#onyu-ft-detail', offset: 40, boxes: { detail: '#onyu-ft-detail', room: page.locator('.onyu-ft-map button', { hasText: name }) } });
  }
  await shot('facility_tour', { focus: '.onyu-ft-tour', boxes: { tour: '.onyu-ft-tour' } });

  await page.goto(BASE + '/trial');
  await shot('trial', { top: true, boxes: { steps: page.locator('section, article').first() } });
  await shot('trial_note', { focus: page.getByText('알아두세요'), boxes: { note: page.getByText('알아두세요').locator('xpath=ancestor::*[self::section or self::article][1]') } });

  // ---------- 회원: 홈 → 예약 → 컨디션 ----------
  await page.goto(BASE + '/');
  await page.getByRole('button', { name: '회원 화면으로 시작하기' }).click();
  await page.getByRole('heading', { name: /님, 안녕하세요/ }).waitFor();
  await shot('member_home', { top: true, boxes: { next: page.getByText('다음 예약').locator('xpath=ancestor::*[self::section or self::article][1]'), book: page.getByRole('link', { name: /수업 예약하기/ }).first(), bar: '.demo-bar' } });

  await page.getByRole('navigation', { name: '회원 메뉴' }).getByRole('link', { name: '수업 예약' }).click();
  await page.waitForTimeout(300);
  await shot('book_dates', { top: true, boxes: { today: page.getByRole('link', { name: /11월 25일 \(수\) · 오늘/ }) } });
  await page.getByRole('link', { name: /11월 25일 \(수\) · 오늘/ }).click();
  await page.waitForTimeout(300);
  const slot = page.locator('li.slot', { hasText: '10:30' });
  await shot('book_times', { focus: page.locator('li.slot').first(), offset: -60, boxes: { slot, slots: page.locator('ul:has(li.slot)').first() } });
  await page.getByRole('link', { name: /^10:30 .* 선택$/ }).click();
  await page.getByRole('heading', { name: '예약 내용을 확인해 주세요' }).waitFor();
  await shot('book_confirm', { top: true, boxes: { pass: page.getByText('유료 무제한 회원권 · 횟수 차감 없음'), cta: page.getByRole('button', { name: '이 수업 예약하기' }) } });
  await page.getByRole('button', { name: '이 수업 예약하기' }).click();
  await page.getByRole('heading', { name: '예약이 완료됐어요' }).waitFor();
  await shot('book_done', { top: true, boxes: { title: page.getByRole('heading', { name: '예약이 완료됐어요' }) } });
  const pain = page.getByRole('radio', { name: /불편한 곳이 있어요/ });
  await shot('condition_empty', { focus: pain, offset: -120, boxes: { radios: page.locator('fieldset').first() } });
  await pain.click();
  await page.getByRole('button', { name: '무릎' }).click();
  await page.getByLabel(/짧게 남길 말/).fill('계단에서 시큰해요');
  await shot('condition_filled', { focus: page.getByRole('button', { name: '무릎' }), offset: -80, boxes: { knee: page.getByRole('button', { name: '무릎' }), memo: page.getByLabel(/짧게 남길 말/), send: page.getByRole('button', { name: '컨디션 전달하기' }) } });
  await page.getByRole('button', { name: '컨디션 전달하기' }).click();
  await page.getByText('컨디션을 전달했어요. 수업 때 반영할게요.').waitFor();
  await shot('condition_sent', { focus: page.getByText('컨디션을 전달했어요. 수업 때 반영할게요.'), offset: -40, boxes: { ok: page.getByText('컨디션을 전달했어요. 수업 때 반영할게요.') } });

  // ---------- 매니저: 수업 명단·컨디션 확인·출석 ----------
  await toStaff('매니저');
  await page.waitForURL(/\/staff$/);
  await shot('staff_home', { top: true, boxes: { main: 'main' } });
  await page.getByRole('link', { name: '수업 관리', exact: true }).click();
  await page.waitForTimeout(300);
  await shot('staff_classes', { top: true, boxes: { row: page.locator('a.session-row', { hasText: '10:30' }) } });
  await page.locator('a.session-row', { hasText: '10:30' }).click();
  await page.waitForTimeout(300);
  await shot('session_top', { top: true, boxes: { main: 'main' } });
  const card = page.locator('li.roster-card', { hasText: '한보람(가상)' });
  await shot('session_member', { focus: card, offset: -40, boxes: { card, cond: card.getByText('불편한 곳이 있어요') } });
  await card.getByRole('button', { name: '컨디션 확인했어요' }).click();
  await card.getByRole('button', { name: '출석', exact: true }).click();
  await card.getByText('출석으로 기록했어요.').waitFor();
  await shot('session_attended', { focus: card, offset: -40, boxes: { card, ok: card.getByText('출석으로 기록했어요.') } });

  // ---------- 코치: 개인 피드백 ----------
  await page.getByRole('button', { name: /코치 화면에서 이 수업 열기/ }).click();
  await page.waitForTimeout(300);
  const coachCard = page.locator('li.roster-card', { hasText: '한보람(가상)' });
  await shot('coach_card', { focus: coachCard, offset: -40, boxes: { card: coachCard } });
  await coachCard.getByLabel('잘 수행한 점').fill('의자에서 일어설 때 무릎 방향을 잘 지키셨어요.');
  await coachCard.getByLabel('다음에 조정할 점').fill('무릎이 시큰하셔서 오늘은 반복을 10회로 줄였어요. 다음에 상태를 보고 조정할게요.');
  await shot('coach_written', { focus: coachCard.getByLabel('잘 수행한 점'), offset: -100, boxes: { good: coachCard.getByLabel('잘 수행한 점'), next: coachCard.getByLabel('다음에 조정할 점'), publish: coachCard.getByRole('button', { name: '회원에게 공개' }) } });
  await coachCard.getByRole('button', { name: '회원에게 공개' }).click();
  await coachCard.getByText(/피드백을 공개했어요/).waitFor();

  // ---------- 회원: 피드백 확인 ----------
  await toMember();
  await page.waitForURL(/\/member$/);
  await shot('member_news', { focus: page.getByText('코치 피드백이 도착했어요').first(), offset: -60, boxes: { news: page.getByText('코치 피드백이 도착했어요').first() } });
  await page.getByRole('link', { name: '코치 설명 보기' }).click();
  const fb = page.locator('li.feedback-card', { hasText: '의자에서 일어설 때 무릎 방향' });
  await shot('member_feedback', { focus: fb, offset: -40, boxes: { fb, more: fb.getByRole('button', { name: '설명이 더 필요해요' }) } });
  await fb.getByRole('button', { name: '설명이 더 필요해요' }).click();
  await shot('member_feedback_more', { focus: fb, offset: -40, boxes: { fb, sent: fb.getByText(/코치와 매니저에게 전달했어요/) } });

  // ---------- 매니저: 측정 결과 수신·설명 공개 ----------
  await toStaff('매니저');
  await page.waitForURL(/\/staff$/);
  await page.getByRole('link', { name: /측정·설명 관리/ }).click();
  await page.waitForTimeout(300);
  await page.getByLabel('결과를 받을 가상 회원').selectOption('mb01');
  await page.getByRole('button', { name: '새 측정 결과 수신 시연' }).click();
  await page.getByText(/새 측정 결과를 저장했어요/).waitFor();
  await shot('measure_received', { focus: page.getByText(/새 측정 결과를 저장했어요/), offset: -160, boxes: { ok: page.getByText(/새 측정 결과를 저장했어요/), btn: page.getByRole('button', { name: '새 측정 결과 수신 시연' }) } });
  await page.getByRole('row', { name: /한보람\(가상\).*설명 확인 전/ }).getByRole('link').click();
  await page.waitForTimeout(300);
  const expl = page.getByLabel(/설명 \(2~3문장/);
  await expl.fill('이번 측정에서 골격근량이 조금 늘었어요. 수분 상태에 따라 달라질 수 있어 다음 측정과 함께 볼게요. 지금처럼 꾸준히 오시면 돼요.');
  await shot('measure_explain', { focus: expl, offset: -140, boxes: { expl, publish: page.getByRole('button', { name: '검토 완료 · 회원에게 공개' }) } });
  await page.getByRole('button', { name: '검토 완료 · 회원에게 공개' }).click();
  await page.getByText(/설명을 공개했어요/).waitFor();

  // ---------- 회원: 내 몸 알아보기·읽어주기 ----------
  await toMember();
  await page.goto(BASE + '/member/body');
  await page.waitForTimeout(400);
  await shot('body_top', { top: true, boxes: { main: 'main' } });
  await shot('body_explain', { focus: '#explain', offset: -20, boxes: { explain: '#explain', speak: page.locator('#explain').getByRole('button', { name: '읽어주기' }) } });
  const cmp = page.getByText(/이전 대비/).first();
  await shot('body_compare', { focus: cmp, offset: -120, boxes: { cmp } });
  await page.goto(BASE + '/member/body/report');
  await page.waitForTimeout(400);
  await shot('body_report', { top: true, boxes: { main: 'main' } });

  // 글씨 크게
  await page.goto(BASE + '/member');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '글씨 크게' }).first().click();
  await page.waitForTimeout(300);
  await shot('member_large', { top: true, boxes: { toggle: page.getByRole('button', { name: '글씨 보통' }).first() } });
  await page.getByRole('button', { name: '글씨 보통' }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('link', { name: '도움 요청' }).first().click();
  await page.waitForTimeout(400);
  await shot('member_help', { top: true, boxes: { main: 'main' } });

  // ---------- 제휴몰 ----------
  await page.goto(BASE + '/member/mall');
  await page.waitForTimeout(300);
  await shot('mall', { top: true, boxes: { main: 'main' } });
  await page.getByRole('link', { name: '데일리 프로틴 밀크 할인코드 받기' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '할인코드 받기' }).click();
  await page.getByText('개인 할인코드가 발급됐어요.').waitFor();
  await shot('mall_code', { focus: page.getByLabel('내 할인코드'), offset: -160, boxes: { code: page.getByLabel('내 할인코드'), ok: page.getByText('개인 할인코드가 발급됐어요.') } });
  await page.getByRole('button', { name: '구매 절차 시연 열기' }).click();
  await page.getByText('구매 절차 시연 화면').waitFor();
  await page.getByRole('button', { name: '내가 받은 코드 넣기' }).click();
  await page.getByRole('button', { name: '적용' }).click();
  await page.getByText(/코드가 적용됐어요/).waitFor();
  await shot('mall_purchase', { focus: page.locator('dd.total'), offset: -260, boxes: { demo: page.getByText('구매 절차 시연 화면'), total: 'dd.total' } });

  // ---------- 매니저: 제휴몰 관리 ----------
  await toStaff('매니저');
  await page.waitForURL(/\/staff$/);
  await page.getByRole('link', { name: '제휴몰 관리' }).click();
  await page.waitForTimeout(300);
  await shot('staff_mall', { top: true, boxes: { main: 'main' } });

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  if (errors.length) console.error('PAGE ERRORS', errors);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
