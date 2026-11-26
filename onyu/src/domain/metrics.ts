import type { BodyValues } from './types';

export interface MetricDef {
  key: keyof BodyValues;
  label: string;
  unit: string;
  core: boolean;
  note?: string;
}

export const METRICS: MetricDef[] = [
  { key: 'weight', label: '체중', unit: 'kg', core: true },
  { key: 'skeletalMuscle', label: '골격근량', unit: 'kg', core: true, note: '몸을 움직이는 근육의 양' },
  { key: 'bodyFatMass', label: '체지방량', unit: 'kg', core: true },
  { key: 'bodyFatPercent', label: '체지방률', unit: '%', core: true },
  { key: 'bmi', label: '체질량지수(BMI)', unit: 'kg/m²', core: false },
  { key: 'totalBodyWater', label: '체수분', unit: 'L', core: false },
  {
    key: 'protein',
    label: '체성분 단백질',
    unit: 'kg',
    core: false,
    note: '몸을 이루는 성분 중 단백질의 추정량이에요. 식사로 먹은 단백질의 양과는 다른 값이에요.',
  },
  { key: 'mineral', label: '무기질', unit: 'kg', core: false },
];

export function metricDef(key: keyof BodyValues): MetricDef {
  return METRICS.find((m) => m.key === key)!;
}

/** 이전 기록과의 차이를 중립적으로 표현한다. 좋아짐·나빠짐을 판정하지 않는다. */
export function changeText(curr: number, prev: number | undefined, unit: string): string {
  if (prev === undefined) return '비교할 이전 기록 없음';
  const d = Math.round((curr - prev) * 10) / 10;
  if (d === 0) return '이전과 같음';
  return `${d > 0 ? '+' : '−'}${Math.abs(d)}${unit} (${d > 0 ? '늘었어요' : '줄었어요'})`;
}
