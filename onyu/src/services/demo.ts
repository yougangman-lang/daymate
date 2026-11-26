// 시연 장치: 역할 전환·가상 회원 선택·기준 시각. 실제 로그인·권한 보안이 아니다.
import type { AppState, DemoState, Result } from '../domain/types';
import { fail, ok } from './common';

export function setDemo(state: AppState, patch: Partial<DemoState>): Result {
  if (patch.memberId && !state.members.some((m) => m.id === patch.memberId)) return fail('가상 회원을 찾을 수 없어요.');
  if (patch.managerId && !state.staff.some((s) => s.id === patch.managerId && s.kind === 'manager')) return fail('매니저를 찾을 수 없어요.');
  if (patch.coachId && !state.staff.some((s) => s.id === patch.coachId && s.kind === 'coach')) return fail('코치를 찾을 수 없어요.');
  return ok({ ...state, demo: { ...state.demo, ...patch } }, undefined);
}

/** 기준 시각을 target으로 옮긴다 (실제 시각 기준 보정값 저장) */
export function setClock(state: AppState, target: Date | null): Result {
  const offset = target ? target.getTime() - Date.now() : 0;
  return ok({ ...state, demo: { ...state.demo, clockOffsetMs: offset } }, undefined, target ? '시연 기준 시각을 옮겼어요.' : '실제 현재 시각으로 되돌렸어요.');
}
