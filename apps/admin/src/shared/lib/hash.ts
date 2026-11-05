/**
 * 문자열 → 0 이상 1 미만의 고정된 값. 시드 데이터를 매번 같게 만든다.
 * FNV-1a만으로는 끝자리만 다른 키("c_pangyo:g_1", "c_pangyo:g_2" …)가 고르게 퍼지지 않아
 * murmur3의 마무리 섞기(fmix32)를 더한다.
 */
export function hash01(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x1_0000_0000;
}
