import { addBlock } from '../lib/actions';
import type { ReportTargetType } from '../lib/types';
import { useStore } from '../store';
import { Modal } from './Modal';

export interface BlockTarget {
  type: ReportTargetType;
  id: string;
  label: string;
}

export function BlockConfirm({ target, onClose, onDone }: { target: BlockTarget | null; onClose: () => void; onDone?: () => void }) {
  const { update, toast } = useStore();
  if (!target) return null;
  const typeLabel = target.type === 'group' ? '그룹' : '회원';
  return (
    <Modal
      open
      title={`${typeLabel} 차단`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-danger"
            data-autofocus
            onClick={() => {
              update((s) => addBlock(s, target.type, target.id, target.label));
              toast(`${target.label}을(를) 차단했어요. 신고·차단 기록에서 해제할 수 있어요.`);
              onClose();
              onDone?.();
            }}
          >
            차단하기
          </button>
        </>
      }
    >
      <p>
        <strong>{target.label}</strong>
        {target.type === 'member'
          ? ' 님을 차단하면 이 회원이 호스트인 그룹이 추천·둘러보기에서 사라지고, 역매칭 후보와 초대에서도 즉시 제외돼요. 대기 중인 관련 초대는 취소돼요.'
          : ' 그룹을 차단하면 추천·둘러보기에서 즉시 사라지고, 이 그룹에서 온 대기 중 초대는 취소돼요.'}
      </p>
      <p className="fine-print">차단 사실은 상대에게 알리지 않아요. 시제품에서는 이 브라우저에만 기록돼요.</p>
    </Modal>
  );
}
