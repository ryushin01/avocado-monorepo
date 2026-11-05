/** URL 검색 파라미터에서 첫 값만 읽는다. */
export const firstParam = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;
