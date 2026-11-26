// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { FacilityTour } from './FacilityTour';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;

function mount(photos?: Parameters<typeof FacilityTour>[0]['photos']) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<MemoryRouter><FacilityTour onBack={() => {}} onTrial={() => {}} photos={photos} /></MemoryRouter>));
  return root;
}
afterEach(() => container.remove());

describe('시설 둘러보기 사진/일러스트', () => {
  it('사진이 없으면 공간 구성 일러스트', () => {
    mount();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[aria-label="접수 공간 구성 일러스트"]')).not.toBeNull();
    expect(container.querySelector('figcaption')?.textContent).toBe('공간 구성 일러스트');
  });

  it('예상 이미지는 “공간 예상 이미지”로 표시하고, 로드 실패 시 일러스트로 전환', () => {
    mount({ reception: { src: '/missing.jpg', alt: '접수 예상 이미지', kind: 'example' } });
    const img = container.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('접수 예상 이미지');
    expect(container.querySelector('figcaption')?.textContent).toBe('공간 예상 이미지');
    act(() => img.dispatchEvent(new Event('error')));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[aria-label="접수 공간 구성 일러스트"]')).not.toBeNull();
    expect(container.querySelector('figcaption')?.textContent).toBe('공간 구성 일러스트');
  });
});
