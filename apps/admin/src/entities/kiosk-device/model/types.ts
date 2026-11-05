/** 매장 키오스크(런처) 기기. 토큰 원문은 발급할 때 한 번만 알 수 있다. */
export type KioskDevice = {
  id: string;
  cafeId: string;
  name: string;
  /** 화면에서 기기를 구분하는 토큰 앞부분 */
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};
