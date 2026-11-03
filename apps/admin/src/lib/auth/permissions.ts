import type { Cafe } from "@/lib/cafes/types";

import type { User } from "./roles";

/** 카탈로그(공통 게임 정보) 등록·수정은 관리자만 한다. */
export function canManageCatalog(user: Pick<User, "role">) {
  return user.role === "admin";
}

/** 관리자는 모든 매장, 스태프는 소속 매장의 재고만 관리한다. */
export function canManageInventory(
  user: Pick<User, "role" | "cafeId">,
  cafeId: string,
) {
  return user.role === "admin" || user.cafeId === cafeId;
}

/** 이용 기록(대여·반납)도 재고와 같은 범위다. */
export const canRecordPlays = canManageInventory;

/** 매장·직원 관리는 관리자만 한다. */
export function canManageOrganization(user: Pick<User, "role">) {
  return user.role === "admin";
}

/**
 * 사용자가 볼 수 있는 운영 중인 매장. 폐점한 매장은 대시보드·재고·이용 기록에서 빠진다
 * (매장 관리 화면에서는 모두 보인다).
 */
export function visibleCafes(user: Pick<User, "role" | "cafeId">, cafes: Cafe[]) {
  const open = cafes.filter((c) => c.status === "open");
  return user.role === "admin" ? open : open.filter((c) => c.id === user.cafeId);
}

/**
 * 화면에 보여줄 매장을 정한다. 스태프는 요청과 관계없이 소속 매장,
 * 관리자는 요청한 매장(없거나 잘못되면 첫 매장).
 */
export function resolveCafe(
  user: Pick<User, "role" | "cafeId">,
  cafes: Cafe[],
  requestedId?: string,
): Cafe | null {
  const allowed = visibleCafes(user, cafes);
  return allowed.find((c) => c.id === requestedId) ?? allowed[0] ?? null;
}
