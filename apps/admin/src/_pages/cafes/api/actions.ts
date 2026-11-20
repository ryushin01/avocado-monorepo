"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db/server";
import { recordAudit } from "@/server/audit/data";
import { getCurrentUser } from "@/server/auth/current-user";
import type { AuditAction } from "@/entities/audit";
import { canManageOrganization } from "@/entities/user";
import {
  addCafeTable,
  createCafe,
  listCafeTables,
  setCafeStatus,
  setCafeTableActive,
  updateCafe,
} from "@/server/cafes/data";
import { cafeInputSchema, cafeTableInputSchema } from "@/entities/cafe/index.server";
import type { Cafe, CafeTable } from "@/entities/cafe";
import { createKioskDeviceRepository } from "@/server/kiosk/devices";
import { type KioskDevice } from "@/entities/cafe";
import {
  editConflictMessage,
  formDataToObject,
  formError,
  parseVersion,
  STALE_FORM_MESSAGE,
  type ActionResult,
  type FormState,
} from "@/shared/lib/form";

const FORBIDDEN = "매장은 관리자만 관리할 수 있습니다.";
const NOT_FOUND = "매장을 찾을 수 없습니다. 목록을 새로고침해주세요.";

// 매장 이름·운영 여부는 사이드바 계정 영역, 대시보드, 재고·이용 기록의 매장 선택에 모두 쓰인다.
const revalidate = () => revalidatePath("/", "layout");

async function submitCafeForm(
  formData: FormData,
  action: AuditAction,
  save: (input: ReturnType<typeof cafeInputSchema.parse>, values: Record<string, string | string[]>) => Promise<Cafe | string>,
  done: (name: string) => string,
): Promise<FormState> {
  const values = formDataToObject(formData);
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return formError(values, FORBIDDEN);

  const parsed = cafeInputSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const result = await save(parsed.data, values);
  if (result === "stale") return formError(values, STALE_FORM_MESSAGE);
  if (result === "changed") {
    revalidate();
    return formError(values, editConflictMessage("이 매장을"));
  }
  if (result === "duplicate-name") {
    return {
      status: "error",
      fieldErrors: { name: ["같은 이름의 매장이 이미 있습니다."] },
      values,
    };
  }
  if (typeof result === "string") return formError(values, NOT_FOUND);

  await recordAudit(actor, { action, targetName: result.name, cafeId: result.id });
  revalidate();
  return { status: "success", message: done(result.name) };
}

export async function createCafeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitCafeForm(formData, "cafe.create", createCafe, (name) => `'${name}'을(를) 등록했습니다.`);
}

export async function updateCafeAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitCafeForm(
    formData,
    "cafe.update",
    // 폼을 연 시점의 버전과 같을 때만 저장한다(낙관적 잠금).
    async (input, values) => {
      const version = parseVersion(values);
      return version === null ? "stale" : updateCafe(id, input, version);
    },
    (name) => `'${name}' 정보를 수정했습니다.`,
  );
}

export async function closeCafeAction(id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) {
    return { ok: false, message: FORBIDDEN };
  }
  const result = await setCafeStatus(id, "closed");
  if (result === "not-found") return { ok: false, message: NOT_FOUND };
  if (result === "in-use") {
    return {
      ok: false,
      message: "손님이 이용 중인 게임이 있어 폐점할 수 없습니다. 모두 반납한 뒤 다시 시도해주세요.",
    };
  }
  await recordAudit(actor, { action: "cafe.close", targetName: result.name, cafeId: result.id });
  revalidate();
  return { ok: true, message: `'${result.name}'을(를) 폐점 처리했습니다.` };
}

export async function reopenCafeAction(id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) {
    return { ok: false, message: FORBIDDEN };
  }
  const result = await setCafeStatus(id, "open");
  if (typeof result === "string") return { ok: false, message: NOT_FOUND };
  await recordAudit(actor, { action: "cafe.reopen", targetName: result.name, cafeId: result.id });
  revalidate();
  return { ok: true, message: `'${result.name}' 운영을 다시 시작했습니다.` };
}

// ── 키오스크 기기 토큰 (관리자) ───────────────────────────────

const kioskDevices = async () => createKioskDeviceRepository(await getDb());

export async function listKioskDevicesAction(cafeId: string): Promise<KioskDevice[]> {
  if (!canManageOrganization(await getCurrentUser())) return [];
  return (await kioskDevices()).list(cafeId);
}

/** 새 기기 토큰. 원문은 이 응답에서만 볼 수 있다. */
export async function issueKioskTokenAction(
  cafeId: string,
  name: string,
): Promise<{ ok: true; token: string; device: KioskDevice } | { ok: false; message: string }> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return { ok: false, message: FORBIDDEN };
  const parsed = z.string().trim().min(1, "기기 이름을 입력해주세요.").max(30, "기기 이름은 30자 이하여야 합니다.").safeParse(name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const result = await (await kioskDevices()).issue(cafeId, parsed.data, new Date());
  if (result === "closed-cafe") return { ok: false, message: "폐점한 매장에는 발급할 수 없습니다." };
  // 토큰 원문은 남기지 않는다. 앞부분만으로 기기를 구분한다.
  await recordAudit(actor, {
    action: "kiosk.issue",
    targetName: result.device.name,
    cafeId,
    detail: `토큰 ${result.device.tokenPrefix}`,
  });
  revalidate();
  return { ok: true, ...result };
}

export async function revokeKioskDeviceAction(cafeId: string, id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return { ok: false, message: FORBIDDEN };
  const result = await (await kioskDevices()).revoke(cafeId, id, new Date());
  if (result === "not-found") return { ok: false, message: "기기를 찾을 수 없거나 이미 폐기했습니다." };
  await recordAudit(actor, {
    action: "kiosk.revoke",
    targetName: result.name,
    cafeId,
    detail: `토큰 ${result.tokenPrefix}`,
  });
  revalidate();
  return { ok: true, message: `'${result.name}' 토큰을 폐기했습니다. 그 기기는 더 이상 접속할 수 없습니다.` };
}

// ── 매장 테이블 (관리자) ───────────────────────────────
// 예약 화면의 테이블 선택과 자동 배정이 이 목록을 쓴다.

const TABLE_NOT_FOUND = "테이블을 찾을 수 없습니다. 창을 닫았다가 다시 열어주세요.";

export async function listCafeTablesAction(cafeId: string): Promise<CafeTable[]> {
  if (!canManageOrganization(await getCurrentUser())) return [];
  return listCafeTables(cafeId);
}

export type AddCafeTableResult =
  | { ok: true; table: CafeTable; message: string }
  | { ok: false; message: string; field?: "label" | "seats" };

export async function addCafeTableAction(
  cafeId: string,
  input: { label: string; seats: string },
): Promise<AddCafeTableResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return { ok: false, message: FORBIDDEN };
  const parsed = cafeTableInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue.message, field: issue.path[0] === "seats" ? "seats" : "label" };
  }
  const result = await addCafeTable(cafeId, parsed.data);
  if (result === "not-found") return { ok: false, message: NOT_FOUND };
  if (result === "duplicate-label") return { ok: false, message: "같은 이름의 테이블이 이미 있습니다.", field: "label" };
  await recordAudit(actor, { action: "table.add", targetName: result.label, cafeId, detail: `${result.seats}석` });
  revalidatePath("/reservations");
  return { ok: true, table: result, message: `'${result.label}' 테이블(${result.seats}석)을 추가했습니다.` };
}

/** 쓰지 않게 된 테이블은 지우지 않고 끈다. 이미 배정한 예약은 그대로 두고 새 배정에서만 뺀다. */
export async function setCafeTableActiveAction(cafeId: string, id: string, active: boolean): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageOrganization(actor)) return { ok: false, message: FORBIDDEN };
  const result = await setCafeTableActive(cafeId, id, active);
  if (typeof result === "string") return { ok: false, message: TABLE_NOT_FOUND };
  await recordAudit(actor, { action: active ? "table.activate" : "table.deactivate", targetName: result.label, cafeId });
  revalidatePath("/reservations");
  return {
    ok: true,
    message: active
      ? `'${result.label}' 테이블을 다시 씁니다.`
      : `'${result.label}' 테이블을 새 예약에 배정하지 않습니다. 이미 배정한 예약은 그대로 둡니다.`,
  };
}
