import type { AxisValue } from '../lib/types';

export interface AxisOption {
  value: AxisValue;
  label: string;
  hint: string;
}

export interface Axis {
  key: string;
  name: string;
  question: string;
  /** 0 쪽 / 100 쪽 짧은 이름 (시각화용) */
  low: string;
  high: string;
  options: [AxisOption, AxisOption, AxisOption];
  /** 성향이 비슷할 때 보여줄 이유 (값별) */
  similar: Record<AxisValue, string>;
  /** 그룹 쪽 성향을 설명하는 문장 (값별) */
  groupStyle: Record<AxisValue, string>;
}

export const AXES: Axis[] = [
  {
    key: 'size',
    name: '동행 인원',
    question: '몇 명이서 함께하는 게 편한가요?',
    low: '소규모',
    high: '여럿이',
    options: [
      { value: 0, label: '2~3명으로 소규모', hint: '서로 얼굴 보며 이야기하기 좋은 인원' },
      { value: 50, label: '상관없음', hint: '활동에 맞으면 몇 명이든 괜찮아요' },
      { value: 100, label: '4~6명으로 함께', hint: '여럿이 모이는 분위기가 좋아요' },
    ],
    similar: {
      0: '작은 그룹을 선호하는 점이 비슷해요.',
      50: '인원 구성에 유연한 점이 비슷해요.',
      100: '여럿이 함께하는 분위기를 좋아하는 점이 비슷해요.',
    },
    groupStyle: { 0: '2~3명 소규모 그룹', 50: '인원 무관', 100: '4~6명 그룹' },
  },
  {
    key: 'social',
    name: '교류 방식',
    question: '함께하는 동안 어떤 교류를 원하나요?',
    low: '활동 집중',
    high: '적극 교류',
    options: [
      { value: 0, label: '활동 자체에 집중', hint: '대화보다 경기·전시·공연에 몰입' },
      { value: 50, label: '자연스럽게 대화', hint: '쉬는 시간에 편하게 이야기' },
      { value: 100, label: '적극적으로 친해지고 싶음', hint: '새로운 사람과 친해지는 게 목표' },
    ],
    similar: {
      0: '활동 자체에 집중하려는 점이 비슷해요.',
      50: '자연스러운 대화를 원하는 점이 비슷해요.',
      100: '적극적으로 친해지고 싶은 마음이 비슷해요.',
    },
    groupStyle: { 0: '활동 집중', 50: '자연스러운 대화', 100: '적극적인 교류' },
  },
  {
    key: 'pace',
    name: '활동 속도',
    question: '활동 속도는 어떤 게 좋아요?',
    low: '여유롭게',
    high: '알차게',
    options: [
      { value: 0, label: '천천히 여유롭게', hint: '한 곳에 오래 머물러도 좋아요' },
      { value: 50, label: '적당한 이동과 휴식', hint: '움직이다 쉬다 균형 있게' },
      { value: 100, label: '여러 곳을 알차게 방문', hint: '시간 대비 많이 보고 싶어요' },
    ],
    similar: {
      0: '천천히 둘러보는 일정이에요.',
      50: '이동과 휴식의 균형을 원하는 점이 비슷해요.',
      100: '여러 곳을 알차게 도는 일정이에요.',
    },
    groupStyle: { 0: '여유로운 속도', 50: '적당한 이동과 휴식', 100: '여러 곳 알차게' },
  },
  {
    key: 'plan',
    name: '계획 방식',
    question: '일정은 어떻게 정하는 편이에요?',
    low: '즉흥',
    high: '계획',
    options: [
      { value: 0, label: '현장에서 유연하게 결정', hint: '그날 분위기 따라 움직여요' },
      { value: 50, label: '핵심 일정만 사전 결정', hint: '만남 시간·장소 정도만 정해요' },
      { value: 100, label: '시간과 동선을 구체적으로 결정', hint: '동선표가 있어야 마음이 편해요' },
    ],
    similar: {
      0: '현장에서 유연하게 정하는 스타일이 비슷해요.',
      50: '핵심 일정만 정해두는 스타일이 비슷해요.',
      100: '시간과 동선을 미리 정하는 스타일이 비슷해요.',
    },
    groupStyle: { 0: '현장에서 유연하게', 50: '핵심 일정만 사전 결정', 100: '시간·동선 구체적으로' },
  },
  {
    key: 'spend',
    name: '지출 성향',
    question: '활동할 때 지출은 어떻게 하나요?',
    low: '예산 안에서',
    high: '경험에 투자',
    options: [
      { value: 0, label: '정한 예산 안에서', hint: '미리 정한 금액을 넘기지 않아요' },
      { value: 50, label: '소소한 추가 지출 가능', hint: '간식·음료 정도는 괜찮아요' },
      { value: 100, label: '마음에 드는 경험에 추가 지출 가능', hint: '좋으면 더 써도 괜찮아요' },
    ],
    similar: {
      0: '정한 예산 안에서 움직이려는 점이 비슷해요.',
      50: '소소한 추가 지출 정도를 생각하는 점이 비슷해요.',
      100: '마음에 드는 경험엔 지출을 아끼지 않는 점이 비슷해요.',
    },
    groupStyle: { 0: '정한 예산 안에서', 50: '소소한 추가 지출 가능', 100: '경험에 추가 지출 가능' },
  },
];
