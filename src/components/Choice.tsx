import type { ReactNode } from 'react';

interface ChoiceProps {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
  value?: string;
}

/** 실제 radio/checkbox 입력을 쓰는 칩. 키보드·스크린리더에서 그대로 동작한다. */
export function Choice({ type, name, checked, onChange, children, className = '', value }: ChoiceProps) {
  return (
    <label className={`pill-input ${className}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} value={value} />
      <span>{children}</span>
    </label>
  );
}
