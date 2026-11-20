import type { New } from "@/db/mappers";
import type { Cafe, CafeTable } from "@/entities/cafe";

/** 매장마다 같은 배치: 2인석 A1~A4, 4인석 B1~B4, 6인석 C1~C2 (가상의 배치) */
const LAYOUT = [
  ...[1, 2, 3, 4].map((n) => ({ label: `A${n}`, seats: 2 })),
  ...[1, 2, 3, 4].map((n) => ({ label: `B${n}`, seats: 4 })),
  ...[1, 2].map((n) => ({ label: `C${n}`, seats: 6 })),
];

export function createSeedTables(cafes: New<Cafe>[]): CafeTable[] {
  return cafes.flatMap((cafe) =>
    LAYOUT.map(({ label, seats }) => ({ id: `t_${cafe.id}_${label}`, cafeId: cafe.id, label, seats, active: true })),
  );
}
