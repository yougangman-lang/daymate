// 시설 둘러보기 (공개 경로 /facility). 공간 선택용 배치 개념도이며 실제 비율의 건축 도면이 아니다.
import { useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Icon } from '../components/Icon';
import { SpeakControls } from '../components/Speak';
import { FontToggle, useBack, usePublicPage, type BackState } from '../components/PublicPage';
import { useAppState } from '../store/store';
import { findMember } from '../domain/selectors';

export type SpaceId = 'reception' | 'office' | 'fitness' | 'lounge' | 'shower' | 'storage' | 'passage';
export type Photo = { src: string; alt: string; kind: 'example' | 'actual' };
type Props = {
  onBack: () => void;
  onTrial: () => void;
  photos?: Partial<Record<SpaceId, Photo>>;
  renderReadAloud?: (text: string) => ReactNode;
  toolbar?: ReactNode;
};

export const SPACES: { id: SpaceId; name: string; area: number; summary: string; items: string[] }[] = [
  { id: 'reception', name: '접수', area: 2, summary: '처음 오셨다면 이곳에서 안내해 드립니다.', items: ['예약과 무료체험 일정을 확인합니다.', '앱 이용이 어려우시면 직원에게 말씀해 주세요.'] },
  { id: 'office', name: '측정·상담실', area: 4, summary: '운동 경험과 참여 목적을 이야기하고 기초 상태를 살펴봅니다.', items: ['인바디·혈압·악력 측정 장비를 둡니다.', '측정 결과와 문진 내용을 바탕으로 수업 시 참고할 사항을 정리합니다.', '측정값만으로 질환이나 영양 결핍을 진단하지 않습니다.'] },
  { id: 'fitness', name: '피트니스룸', area: 20, summary: '함께 운동하면서 각자에게 필요한 지도를 받습니다.', items: ['회원 최대 6명, 코치 2명, 매니저 1명이 참여합니다.', '사이클 2대, 로잉 2대, 덤벨 1~10kg과 소도구를 배치합니다.', '60분 수업: 준비 20분 → 본운동 20분 → 게임 15분 → 정리 5분.', '같은 수업 안에서 무게·횟수·휴식시간을 개인별로 조정합니다.'] },
  { id: 'lounge', name: '라운지', area: 9, summary: '운동을 마친 뒤 잠시 쉬거나 다른 회원과 이야기를 나눕니다.', items: ['6~8인 대화 좌석, 커피머신, 안마의자 2대를 둡니다.', '단백질·웰니스 음료 자판기를 배치합니다.', '라운지와 커피 이용은 회원권에 포함하며 자판기 음료는 별도 구매입니다. 온유 제휴몰 할인코드는 자판기에서 쓸 수 없어요.'] },
  { id: 'shower', name: '샤워·탈의실', area: 7, summary: '운동 전후 옷을 갈아입고 개인 물품을 보관합니다.', items: ['샤워부스 총 2개와 개인 물품 보관 공간을 계획했습니다.', '젖은 동선과 운동 구역을 분리하는 배치입니다.'] },
  { id: 'storage', name: '창고', area: 2, summary: '직원이 수업 도구와 운영 물품을 관리하는 공간입니다.', items: ['소도구, 음료와 청소물품을 구분해 보관합니다.', '회원 이용 공간과 분리합니다.'] },
  { id: 'passage', name: '통로·화장실 등', area: 6, summary: '각 공간을 오가는 이동 공간과 편의 공간입니다.', items: ['입구·운동실·라운지·측정실을 연결하는 동선을 계획했습니다.', '실제 출입구와 피난 동선은 공간 계약 및 설계 시 확정합니다.'] },
];
export const TOUR: SpaceId[] = ['reception', 'office', 'fitness', 'lounge', 'shower'];

/** 받침 유무에 따라 '을/를' */
function objParticle(word: string): string {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '을(를)';
  return (c - 0xac00) % 28 ? '을' : '를';
}

function Illustration({ id, name }: { id: SpaceId; name: string }) {
  return (
    <svg viewBox="0 0 600 300" role="img" aria-label={`${name} 공간 구성 일러스트`} className="onyu-ft-scene">
      <rect width="600" height="300" fill="#F1E9DC" />
      <path d="M40 235V55H560V235" fill="#FFFCF6" stroke="#C1B5A3" strokeWidth="3" />
      <path d="M40 235H560L595 285H5Z" fill="#D9CCB8" />
      <g fill="#D8DFC9" stroke="#526547" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {id === 'fitness' && (
          <>
            {[145, 390].map((x) => (
              <g key={x}>
                <circle cx={x} cy="210" r="38" />
                <circle cx={x + 65} cy="210" r="38" />
                <path d={`M${x} 210l32-60 33 60h-65l54-38M${x + 25} 145h28M${x + 58} 165l-8-38h27`} fill="none" />
              </g>
            ))}
            <path d="M260 90h80m-80-15v30m80-30v30" fill="none" strokeWidth="13" />
          </>
        )}
        {id === 'lounge' && (
          <>
            <rect x="80" y="160" width="215" height="65" rx="16" />
            <path d="M95 160v-36h185v36M104 225v15m164-15v15" fill="none" />
            <rect x="365" y="100" width="115" height="135" rx="12" />
            <rect x="384" y="119" width="77" height="57" rx="6" fill="#FFFCF6" />
            <path d="M393 200h62" />
          </>
        )}
        {id === 'office' && (
          <>
            <path d="M120 180h225m-210 0v60m195-60v60" fill="none" strokeWidth="10" />
            <rect x="175" y="105" width="110" height="65" rx="8" />
            <path d="M230 170v10" />
            <rect x="405" y="190" width="90" height="40" rx="10" />
            <path d="M450 190V92h30m-30 23h-25" fill="none" />
          </>
        )}
        {id === 'reception' && (
          <>
            <rect x="125" y="155" width="350" height="85" rx="12" />
            <rect x="320" y="92" width="90" height="55" rx="6" />
            <path d="M365 147v8" />
            <circle cx="210" cy="110" r="25" />
            <path d="M175 155q0-35 35-35t35 35" />
          </>
        )}
        {id === 'shower' && (
          <>
            {[130, 325].map((x) => (
              <g key={x}>
                <rect x={x} y="80" width="145" height="160" rx="6" />
                <path d={`M${x + 28} 115h70v20m-10 15v12m10-12v12m10-12v12M${x + 65} 213h15`} fill="none" />
              </g>
            ))}
          </>
        )}
        {id === 'storage' && (
          <>
            <path d="M150 80v160m300-160v160M150 130h300M150 185h300M150 240h300" fill="none" strokeWidth="8" />
            {[175, 275, 375].map((x) => (
              <rect key={x} x={x} y="145" width="65" height="38" rx="5" />
            ))}
          </>
        )}
        {id === 'passage' && <path d="M200 235V85h200v150M250 190h100m-25-25 25 25-25 25" fill="none" strokeWidth="8" />}
      </g>
    </svg>
  );
}

export function FacilityTour({ onBack, onTrial, photos, renderReadAloud, toolbar }: Props) {
  const [selected, setSelected] = useState<SpaceId>('reception');
  const [failedPhotos, setFailedPhotos] = useState<Partial<Record<SpaceId, string>>>({});
  const detail = useRef<HTMLElement>(null);
  const space = SPACES.find((item) => item.id === selected)!;
  const step = TOUR.indexOf(selected);
  const photo = photos?.[selected];
  const usablePhoto = photo && failedPhotos[selected] !== photo.src ? photo : undefined;
  const explanation = `${space.name}. ${space.summary} ${space.items.join(' ')}`;

  function choose(id: SpaceId) {
    setSelected(id);
    detail.current?.focus({ preventScroll: true });
    detail.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  return (
    <main className="onyu-ft" aria-labelledby="onyu-ft-title" id="main">
      <header className="onyu-ft-heading">
        <div className="onyu-ft-topbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            <Icon name="back" size={20} /> 이전으로
          </button>
          {toolbar}
        </div>
        <BrandLogo to="/" size="md" label="온유 시작 화면으로" />
        <h1 id="onyu-ft-title">시설 둘러보기</h1>
        <p>공간을 눌러 살펴보세요. 처음 방문하는 순서대로도 볼 수 있어요.</p>
        <p className="onyu-ft-note">시설 구성 예시 · 전용 50평(약 165.3㎡) 계획</p>
      </header>

      <div className="onyu-ft-layout">
        <section className="onyu-ft-map-panel" aria-labelledby="onyu-ft-map-title">
          <h2 id="onyu-ft-map-title">한눈에 보는 온유</h2>
          <div className="onyu-ft-map" role="group" aria-label="공간 선택">
            {SPACES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`onyu-ft-room onyu-ft-${item.id}`}
                aria-pressed={selected === item.id}
                aria-controls="onyu-ft-detail"
                onClick={() => choose(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.area}평</span>
                {selected === item.id && <small>✓ 선택됨</small>}
              </button>
            ))}
          </div>
          <p className="onyu-ft-note">공간의 연결을 설명하는 배치 개념도입니다. 도형 크기는 실제 면적 비율과 다릅니다.</p>
        </section>

        <article id="onyu-ft-detail" ref={detail} tabIndex={-1} className="onyu-ft-detail" aria-labelledby="onyu-ft-space-title">
          <div className="onyu-ft-detail-title">
            <h2 id="onyu-ft-space-title">{space.name}</h2>
            <span>{space.area}평</span>
          </div>
          <figure>
            {usablePhoto ? (
              <img src={usablePhoto.src} alt={usablePhoto.alt} onError={() => setFailedPhotos((prev) => ({ ...prev, [selected]: usablePhoto.src }))} />
            ) : (
              <Illustration id={selected} name={space.name} />
            )}
            <figcaption>{usablePhoto && usablePhoto.kind === 'actual' ? '공간 사진' : usablePhoto ? '공간 예상 이미지' : '공간 구성 일러스트'}</figcaption>
          </figure>
          <p className="onyu-ft-summary">{space.summary}</p>
          <ul>
            {space.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {renderReadAloud?.(explanation)}
        </article>
      </div>

      <section className="onyu-ft-tour" aria-labelledby="onyu-ft-tour-title">
        <h2 id="onyu-ft-tour-title">첫 방문 순서로 보기</h2>
        <ol>
          {TOUR.map((id, index) => (
            <li key={id}>
              <button type="button" aria-current={selected === id ? 'step' : undefined} onClick={() => choose(id)}>
                <span>{index + 1}</span>
                {SPACES.find((item) => item.id === id)!.name}
              </button>
            </li>
          ))}
        </ol>
        <p role="status" aria-atomic="true">
          {step >= 0 ? `${step + 1} / ${TOUR.length} · ${space.name}` : `${space.name}${objParticle(space.name)} 보고 있어요. 방문 순서에는 없는 공간이에요.`}
        </p>
        <div className="onyu-ft-actions">
          <button type="button" className="btn btn-secondary" disabled={step <= 0} onClick={() => choose(TOUR[step - 1])}>
            이전 공간
          </button>
          <button type="button" className="btn btn-primary" onClick={() => choose(step < 0 || step === TOUR.length - 1 ? TOUR[0] : TOUR[step + 1])}>
            {step === TOUR.length - 1 ? '처음부터 보기' : step < 0 ? '방문 순서 시작' : '다음 공간'}
          </button>
        </div>
      </section>

      <footer className="onyu-ft-trial">
        <div>
          <h2>직접 경험해 보고 싶으신가요?</h2>
          <p>신규 이용자에게 수업 2회 무료체험을 제공합니다.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onTrial}>
          무료체험 알아보기
        </button>
      </footer>
    </main>
  );
}

/** /facility 경로: 기존 읽어주기·로고·글씨 크게와 연결 */
export function FacilityPage({ photos }: { photos?: Partial<Record<SpaceId, Photo>> }) {
  usePublicPage();
  const back = useBack();
  const navigate = useNavigate();
  const location = useLocation() as Location<BackState | null>;
  const state = useAppState();
  const rate = findMember(state, state.demo.memberId)?.prefs.speechRate ?? 'normal';
  return (
    <FacilityTour
      onBack={back}
      onTrial={() => navigate('/trial', { state: { from: '/facility', fromState: location.state ?? undefined } satisfies BackState })}
      photos={photos}
      toolbar={<FontToggle />}
      renderReadAloud={(text) => <SpeakControls key={text} text={text} label="공간 설명" rate={rate} />}
    />
  );
}
