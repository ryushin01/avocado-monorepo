/** 인원 · 테이블 */
export function formatPlayMeta({ playerCount, table }: { playerCount: number; table?: string }) {
  return table ? `${playerCount}명 · ${table} 테이블` : `${playerCount}명`;
}
