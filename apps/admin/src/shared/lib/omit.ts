/** obj에서 keys를 뺀 얕은 복사본 (폼 전용 값처럼 저장하지 않는 키를 덜어 낼 때) */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy: Partial<T> = { ...obj };
  for (const key of keys) delete copy[key];
  return copy as Omit<T, K>;
}
