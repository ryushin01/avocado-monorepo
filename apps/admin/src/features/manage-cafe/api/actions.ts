"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManageOrganization } from "@/entities/user";
import { createCafe, setCafeStatus, updateCafe } from "@/server/cafes/data";
import { cafeInputSchema } from "@/entities/cafe/schema";
import type { Cafe } from "@/entities/cafe";
import { createKioskDeviceRepository } from "@/server/kiosk/devices";
import { type KioskDevice } from "@/entities/kiosk-device";
import {
  formDataToObject,
  formError,
  type ActionResult,
  type FormState,
} from "@/shared/lib/form";

const FORBIDDEN = "매장은 관리자만 관리할 수 있습니다.";
const NOT_FOUND = "매장을 찾을 수 없습니다. 목록을 새로고침해주세요.";

// 매장 이름·운영 여부는 사이드바 계정 영역, 대시보드, 재고·이용 기록의 매장 선택에 모두 쓰인다.
const revalidate = () => revalidatePath("/", "layout");

async function submitCafeForm(
  formData: FormData,
  save: (input: ReturnType<typeof cafeInputSchema.parse>) => Promise<Cafe | string>,
  done: (name: string) => string,
): Promise<FormState> {
  const values = formDataToObject(formData);
  if (!canManageOrganization(await getCurrentUser())) return formError(values, FORBIDDEN);

  const parsed = cafeInputSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);

  const result = await save(parsed.data);
  if (result === "duplicate-name") {
    return {
      status: "error",
      fieldErrors: { name: ["같은 이름의 매장이 이미 있습니다."] },
      values,
    };
  }
  if (typeof result === "string") return formError(values, NOT_FOUND);

  revalidate();
  return { status: "success", message: done(result.name) };
}

export async function createCafeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitCafeForm(formData, createCafe, (name) => `'${name}'을(를) 등록했습니다.`);
}

export async function updateCafeAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return submitCafeForm(
    formData,
    (input) => updateCafe(id, input),
    (name) => `'${name}' 정보를 수정했습니다.`,
  );
}

export async function closeCafeAction(id: string): Promise<ActionResult> {
  if (!canManageOrganization(await getCurrentUser())) {
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
  revalidate();
  return { ok: true, message: `'${result.name}'을(를) 폐점 처리했습니다.` };
}

export async function reopenCafeAction(id: string): Promise<ActionResult> {
  if (!canManageOrganization(await getCurrentUser())) {
    return { ok: false, message: FORBIDDEN };
  }
  const result = await setCafeStatus(id, "open");
  if (typeof result === "string") return { ok: false, message: NOT_FOUND };
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
  if (!canManageOrganization(await getCurrentUser())) return { ok: false, message: FORBIDDEN };
  const parsed = z.string().trim().min(1, "기기 이름을 입력해주세요.").max(30, "기기 이름은 30자 이하여야 합니다.").safeParse(name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const result = await (await kioskDevices()).issue(cafeId, parsed.data, new Date());
  if (result === "closed-cafe") return { ok: false, message: "폐점한 매장에는 발급할 수 없습니다." };
  revalidate();
  return { ok: true, ...result };
}

export async function revokeKioskDeviceAction(cafeId: string, id: string): Promise<ActionResult> {
  if (!canManageOrganization(await getCurrentUser())) return { ok: false, message: FORBIDDEN };
  const result = await (await kioskDevices()).revoke(cafeId, id, new Date());
  if (result === "not-found") return { ok: false, message: "기기를 찾을 수 없거나 이미 폐기했습니다." };
  revalidate();
  return { ok: true, message: `'${result.name}' 토큰을 폐기했습니다. 그 기기는 더 이상 접속할 수 없습니다.` };
}
