// 선 아이콘. 항상 글자 라벨과 함께 사용한다 (aria-hidden).
export type IconName =
  | 'home' | 'calendar' | 'body' | 'bag' | 'user' | 'help' | 'back' | 'start' | 'check' | 'alert' | 'info'
  | 'speaker' | 'stop' | 'replay' | 'text' | 'list' | 'users' | 'chart' | 'message' | 'gear' | 'gift' | 'copy' | 'bell' | 'clipboard';

const PATHS: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20',
  calendar: 'M4 6.5h16V20H4zM4 10.5h16M8 3.5v5M16 3.5v5M8 14h2M14 14h2M8 17h2',
  body: 'M12 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 9.5h12M12 9.5v5.5M9 21l3-6 3 6M4.5 13.5l2-4M19.5 13.5l-2-4',
  bag: 'M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 16.8v.2',
  back: 'M15 5l-7 7 7 7',
  start: 'M4 11.5 12 4l8 7.5M7 10v9h10v-9',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 3.5 21.5 20h-19zM12 10v4.5M12 17.3v.2',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.2',
  speaker: 'M4 9.5h4l5-4v13l-5-4H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11',
  stop: 'M7 7h10v10H7z',
  replay: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4',
  text: 'M5 6h14M12 6v13M8.5 19h7',
  list: 'M8 7h12M8 12h12M8 17h12M4 7h.5M4 12h.5M4 17h.5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3.1 2.2 3.5 5',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  message: 'M4 5h16v11H9l-5 4z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4.4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1-3-5-3.5-5-1.2C7 7 9.5 7 12 7zM12 7c1-3 5-3.5 5-1.2C17 7 14.5 7 12 7z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  clipboard: 'M8 4.5h8V7H8zM6 6H5v15h14V6h-1M8.5 12h7M8.5 16h5',
};

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
