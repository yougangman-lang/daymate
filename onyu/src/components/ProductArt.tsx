// 제휴 상품 패키지 일러스트 (자체 SVG, 실제 브랜드 이미지 아님)
import type { ReactNode } from 'react';
import type { Product } from '../domain/types';

export function ProductArt({ product, size = 120 }: { product: Product; size?: number }) {
  const c = product.art.color;
  const label = product.name.replace(/\s/g, '').slice(0, 4);
  const shapes: Record<Product['art']['shape'], ReactNode> = {
    carton: (
      <>
        <path d="M34 28h52v80H34z" fill={c} />
        <path d="M34 28l8-14h36l8 14z" fill="#fffcf6" stroke={c} strokeWidth="3" />
        <rect x="40" y="52" width="40" height="30" rx="4" fill="#fffcf6" />
      </>
    ),
    bottle: (
      <>
        <rect x="50" y="10" width="20" height="12" rx="3" fill="#302b25" />
        <path d="M46 22h28v10c8 4 10 10 10 18v56a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6V50c0-8 2-14 10-18z" fill={c} />
        <rect x="40" y="58" width="40" height="28" rx="4" fill="#fffcf6" />
      </>
    ),
    bar: (
      <>
        <rect x="14" y="44" width="92" height="36" rx="6" fill={c} />
        <path d="M14 50l-6-6v36l6-6M106 50l6-6v36l-6-6" fill={c} />
        <rect x="34" y="52" width="52" height="20" rx="3" fill="#fffcf6" />
      </>
    ),
    pouch: (
      <>
        <path d="M30 22h60l-4 88H34z" fill={c} />
        <path d="M30 22h60v10H30z" fill="#fffcf6" opacity=".5" />
        <rect x="40" y="54" width="40" height="28" rx="4" fill="#fffcf6" />
      </>
    ),
    box: (
      <>
        <path d="M22 40l38-14 38 14v58l-38 14-38-14z" fill={c} />
        <path d="M22 40l38 14 38-14" fill="none" stroke="#fffcf6" strokeWidth="3" />
        <rect x="38" y="60" width="44" height="22" rx="3" fill="#fffcf6" />
      </>
    ),
    can: (
      <>
        <rect x="38" y="18" width="44" height="90" rx="8" fill={c} />
        <rect x="38" y="18" width="44" height="10" rx="5" fill="#bfb19c" />
        <rect x="42" y="54" width="36" height="28" rx="4" fill="#fffcf6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${product.name} 패키지 일러스트 (시연용)`}>
      <rect width="120" height="120" rx="16" fill="#efe6d7" />
      {shapes[product.art.shape]}
      <text x="60" y="73" textAnchor="middle" fontSize="9" fontWeight="700" fill="#302b25" fontFamily="sans-serif">
        {label}
      </text>
    </svg>
  );
}
