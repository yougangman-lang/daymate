// 제휴사 할인코드 어댑터.
// 실제 운영에서는 제휴사가 판매·결제·배송을 맡고, 온유 서버가 제휴사 API에 회원별 코드를 등록한다.
// 시제품은 브라우저 안에서 코드를 만들며 어떤 제휴사에도 전송하지 않는다.
export interface PartnerCouponGateway {
  readonly name: string;
  createCode(): string;
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 O/0, I/1 제외

export const demoPartnerGateway: PartnerCouponGateway = {
  name: '시연용 코드 발급기 (제휴사 미연결)',
  createCode() {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    const s = Array.from(bytes, (b) => CHARS[b % CHARS.length]).join('');
    return `ONYU-${s.slice(0, 4)}-${s.slice(4)}`;
  },
};
