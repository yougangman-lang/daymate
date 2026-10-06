import { Link } from 'react-router-dom';
import { AXES } from '../data/axes';
import { getCategory } from '../data/categories';
import { toggleSave } from '../lib/actions';
import { formatDate, formatWon } from '../lib/date';
import { remainingSeats } from '../lib/matching';
import type { Group } from '../lib/types';
import { ME } from '../lib/types';
import { useStore } from '../store';
import { CategoryArt } from './CategoryArt';
import { Icon, ScorePill } from './ui';

interface Props {
  group: Group;
  score?: number;
  reasons?: string[];
}

export function GroupCard({ group, score, reasons }: Props) {
  const { state, update, personById, toast } = useStore();
  const cat = getCategory(group.category);
  const host = personById(group.hostId);
  const saved = state.savedGroupIds.includes(group.id);
  const left = remainingSeats(group);
  const variant = Number(group.id.replace(/\D/g, '').slice(-2)) || 0;

  return (
    <article className="group-card">
      <div className="gc-media">
        <CategoryArt category={group.category} variant={variant} />
        <span className="gc-cat">{cat.short}</span>
        {group.hostId === ME && <span className="gc-mine">내 그룹</span>}
        <button
          type="button"
          className={`gc-save ${saved ? 'on' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? `${group.title} 저장 취소` : `${group.title} 저장`}
          onClick={() => {
            update((s) => toggleSave(s, group.id));
            toast(saved ? '저장을 취소했어요.' : '저장했어요. 내 동행에서 볼 수 있어요.');
          }}
        >
          <Icon name={saved ? 'heart-fill' : 'heart'} size={20} />
        </button>
      </div>
      <div className="gc-body">
        {score !== undefined && <ScorePill score={score} />}
        <h3 className="gc-title">
          <Link to={`/groups/${group.id}`} className="stretched">
            {group.title}
          </Link>
        </h3>
        <dl className="gc-meta">
          <div>
            <dt className="sr-only">일시</dt>
            <dd>
              <Icon name="clock" size={15} /> {formatDate(group.date)} {group.startTime}–{group.endTime}
            </dd>
          </div>
          <div>
            <dt className="sr-only">장소</dt>
            <dd>
              <Icon name="pin" size={15} /> {group.place}
            </dd>
          </div>
          <div className="gc-row">
            <div>
              <dt className="sr-only">1인 예상 비용</dt>
              <dd className="gc-cost">{group.cost.total === 0 ? '비용 없음' : `1인 약 ${formatWon(group.cost.total)}`}</dd>
            </div>
            <div>
              <dt className="sr-only">모집 현황</dt>
              <dd className={`gc-seats ${left === 0 ? 'full' : ''}`}>
                {left === 0 ? '모집 마감' : `${group.memberIds.length}/${group.capacity}명 · ${left}자리 남음`}
              </dd>
            </div>
          </div>
        </dl>
        <ul className="gc-vibes" aria-label="동행 분위기">
          <li>{AXES[0].groupStyle[group.prefs[0]]}</li>
          <li>{AXES[1].groupStyle[group.prefs[1]]}</li>
          <li>{AXES[2].groupStyle[group.prefs[2]]}</li>
        </ul>
        {reasons && reasons.length > 0 && (
          <ul className="gc-reasons" aria-label="추천 이유">
            {reasons.map((r) => (
              <li key={r}>
                <Icon name="check" size={14} /> {r}
              </li>
            ))}
          </ul>
        )}
        <p className="gc-host">
          호스트 {host?.nickname ?? '알 수 없음'}
          {group.isSeed && <span className="gc-fiction"> · 예시 그룹(허구)</span>}
        </p>
      </div>
    </article>
  );
}
