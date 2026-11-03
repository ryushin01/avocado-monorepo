"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageOrganization } from "@/lib/auth/permissions";
import { createCafe, setCafeStatus, updateCafe } from "@/lib/cafes/data";
import { cafeInputSchema } from "@/lib/cafes/schema";
import type { Cafe } from "@/lib/cafes/types";
import {
  formDataToObject,
  formError,
  type ActionResult,
  type FormState,
} from "@/lib/form";

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
