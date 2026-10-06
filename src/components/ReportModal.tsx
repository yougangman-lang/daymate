import { useEffect, useId, useState } from 'react';
import { LIMITS, REPORT_REASONS, addBlock, addReport, isBlocked } from '../lib/actions';
import type { ReportTargetType } from '../lib/types';
import { useStore } from '../store';
import { Modal } from './Modal';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  label: string;
}

export function ReportModal({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState('');
  const detailId = useId();
  const errorId = useId();

  useEffect(() => {
    if (target) {
      setReason('');
      setDetail('');
      setAlsoBlock(false);
      setError('');
    }
  }, [target]);

  if (!target) return null;
  const already = isBlocked(state, target.type, target.id);
  const typeLabel = target.type === 'group' ? '그룹' : '회원';

  const submit = () => {
    const r = addReport(state, { targetType: target.type, targetId: target.id, targetLabel: target.label, reason, detail });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    let next = r.state;
    if (alsoBlock) next = addBlock(next, target.type, target.id, target.label);
    update(() => next);
    toast(alsoBlock ? '신고 기록을 남기고 차단했어요. (운영자에게 전달되지 않음)' : '신고 기록을 남겼어요. (운영자에게 전달되지 않음)');
    onClose();
  };

  return (
    <Modal
      open
      title={`${typeLabel} 신고`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn-danger" onClick={submit}>
            신고 기록 남기기
          </button>
        </>
      }
    >
      <p className="modal-target">
        대상: <strong>{target.label}</strong>
      </p>
      <div className="notice notice-warn" role="note">
        시제품에서는 신고가 <strong>운영자에게 전달되지 않아요.</strong> 이 브라우저에만 기록되며, 실제 서비스에서는 운영팀 검토
        절차가 필요해요. 긴급한 위험이 있다면 112에 신고하세요.
      </div>
      <fieldset className="field">
        <legend>신고 사유 (필수)</legend>
        <div className="radio-list">
          {REPORT_REASONS.map((r) => (
            <label key={r} className="radio-row">
              <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor={detailId}>추가 설명 {reason === '기타' ? '(필수, 5자 이상)' : '(선택)'}</label>
        <textarea
          id={detailId}
          rows={3}
          maxLength={LIMITS.reportDetail}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          aria-describedby={error ? errorId : undefined}
          placeholder="어떤 일이 있었는지 적어 주세요. 연락처 등 개인정보는 적지 마세요."
        />
        <p className="field-hint">
          {detail.length}/{LIMITS.reportDetail}
        </p>
      </div>
      {!already && (
        <label className="check-row">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
          <span>이 {typeLabel}도 차단하기 (추천·역매칭에서 즉시 제외)</span>
        </label>
      )}
      {error && (
        <p className="form-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
