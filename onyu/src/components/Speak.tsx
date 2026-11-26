// 읽어주기 / 멈추기 / 다시 듣기. 브라우저 음성 합성 지원 여부를 확인하고, 미지원 시 글 안내를 유지한다.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

export function stopSpeech() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

export function SpeakControls({ text, label, rate = 'normal' }: { text: string; label: string; rate?: 'normal' | 'slow' }) {
  const supported = speechSupported();
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 화면을 떠나면 재생 중지
  useEffect(() => () => stopSpeech(), []);

  if (!supported) {
    return (
      <p className="hint no-print" role="note">
        이 브라우저에서는 읽어주기를 지원하지 않아요. 화면의 글로 안내를 확인해 주세요.
      </p>
    );
  }

  const play = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = rate === 'slow' ? 0.8 : 1;
    u.onend = () => setState('done');
    u.onerror = () => setState('done');
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setState('playing');
  };
  const stop = () => {
    window.speechSynthesis.cancel();
    setState('done');
  };

  return (
    <div className="row no-print" role="group" aria-label={`${label} 음성 안내`}>
      {state === 'playing' ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={stop}>
          <Icon name="stop" size={20} /> 멈추기
        </button>
      ) : state === 'done' ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={play}>
          <Icon name="replay" size={20} /> 다시 듣기
        </button>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm" onClick={play}>
          <Icon name="speaker" size={20} /> 읽어주기
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {state === 'playing' ? '읽는 중' : ''}
      </span>
    </div>
  );
}
