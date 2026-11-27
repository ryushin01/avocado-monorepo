import type { New } from "@/db/mappers";
import type { auditLogs } from "@/db/schema";
import type { AuditAction } from "@/entities/audit";
import type { Cafe } from "@/entities/cafe";
import type { User } from "@/entities/user";
import { DAY } from "@/shared/lib/kst-time";

export type SeedAuditLog = typeof auditLogs.$inferInsert;

const HOUR = 3_600_000;

/** 며칠 전(daysAgo) 몇 시간 전(hoursAgo)에 누가 무엇을 했는지. 손님 정보·비밀번호·토큰 원문은 넣지 않는다. */
const SAMPLES: {
  daysAgo: number;
  hoursAgo: number;
  actorId: string;
  action: AuditAction;
  targetName: string;
  cafeId?: string;
  detail?: string;
}[] = [
  { daysAgo: 0, hoursAgo: 2, actorId: "u_staff_gangnam", action: "inventory.update", targetName: "카탄", cafeId: "c_gangnam", detail: "수량 3개 → 4개" },
  { daysAgo: 0, hoursAgo: 5, actorId: "u_admin", action: "table.add", targetName: "C3", cafeId: "c_seomyeon", detail: "6석" },
  { daysAgo: 1, hoursAgo: 3, actorId: "u_staff_hongdae", action: "inventory.status", targetName: "스플렌더", cafeId: "c_hongdae", detail: "상태 이용 가능 → 점검 중" },
  { daysAgo: 2, hoursAgo: 1, actorId: "u_admin", action: "game.update", targetName: "글룸헤이븐" },
  { daysAgo: 3, hoursAgo: 4, actorId: "u_admin", action: "kiosk.issue", targetName: "입구 키오스크", cafeId: "c_dunsan", detail: "토큰 kio_seed" },
  { daysAgo: 5, hoursAgo: 2, actorId: "u_staff_pangyo", action: "inventory.add", targetName: "윙스팬", cafeId: "c_pangyo", detail: "수량 2개" },
  { daysAgo: 8, hoursAgo: 6, actorId: "u_admin", action: "staff.deactivate", targetName: "정퇴사" },
  { daysAgo: 12, hoursAgo: 3, actorId: "u_admin", action: "cafe.update", targetName: "부산 서면점", cafeId: "c_seomyeon" },
];

/**
 * 변경 이력 화면이 처음부터 비어 보이지 않도록 넣는 지난 작업 몇 건(now 기준, 매번 같은 결과).
 * 시드에 없는 직원·매장을 가리키는 기록은 빼서, 직원·매장을 따로 준 테스트에서도 외래 키 오류가 나지 않는다.
 */
export function createSeedAudit(users: New<User>[], cafes: New<Cafe>[], now = new Date()): SeedAuditLog[] {
  const names = new Map(users.map((u) => [u.id, u.name]));
  const cafeIds = new Set(cafes.map((c) => c.id));
  return SAMPLES.flatMap((s, i) => {
    const actorName = names.get(s.actorId);
    if (!actorName || (s.cafeId && !cafeIds.has(s.cafeId))) return [];
    return [
      {
        id: `aud_seed_${i + 1}`,
        at: new Date(now.getTime() - s.daysAgo * DAY - s.hoursAgo * HOUR),
        actorId: s.actorId,
        actorName,
        action: s.action,
        targetName: s.targetName,
        cafeId: s.cafeId ?? null,
        detail: s.detail ?? null,
      },
    ];
  });
}
