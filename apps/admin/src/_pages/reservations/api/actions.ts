"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { canManageReservations } from "@/entities/user";
import {
  editConflictMessage,
  formDataToObject,
  formError,
  parseVersion,
  STALE_FORM_MESSAGE,
  type ActionResult,
  type FormState,
} from "@/shared/lib/form";
import {
  addToWaitlist,
  createReservation,
  setReservationStatus,
  setWaitlistStatus,
  updateReservation,
} from "@/server/reservations/data";
import type { ReservationError } from "@/server/reservations/repository";
import { RESERVATION_STATUS_LABELS, type ReservationStatus } from "@/entities/reservation";
import { reservationInputSchema, reservationStatusSchema } from "@/entities/reservation/index.server";
import type { WaitlistError } from "@/server/waitlist/repository";
import { WAITLIST_STATUS_LABELS, type WaitlistStatus } from "@/entities/waitlist";
import { waitlistInputSchema, waitlistStatusSchema } from "@/entities/waitlist/index.server";

const FORBIDDEN = "이 매장의 예약·대기를 관리할 권한이 없습니다.";

const RESERVATION_ERRORS: Record<ReservationError, string> = {
  "not-found": "예약을 찾을 수 없습니다. 목록을 새로고침해주세요.",
  "closed-cafe": "폐점한 매장입니다.",
  past: "지난 시각으로는 예약할 수 없습니다.",
  finished: "이미 입장·취소·노쇼로 끝난 예약입니다.",
  "invalid-transition": "지금 상태에서는 그렇게 바꿀 수 없습니다.",
  "too-early": "예약 시각이 지나야 노쇼로 처리할 수 있습니다.",
  changed: "다른 직원이 먼저 이 예약을 바꿨습니다. 목록을 새로고침해 확인해주세요.",
  "no-table": "그 시각에 앉을 수 있는 빈 테이블이 없습니다. 테이블을 직접 고르거나 '배정 안 함'으로 받아주세요.",
  "table-taken": "고른 테이블에는 그 시각 앞뒤 2시간 안에 다른 예약이 있습니다. 다른 테이블이나 '자동 배정'을 골라주세요.",
  "table-too-small": "고른 테이블의 좌석이 인원보다 적습니다. 다른 테이블이나 '자동 배정'을 골라주세요.",
  "table-not-found": "고른 테이블을 쓸 수 없습니다. 목록을 새로고침해주세요.",
};

const WAITLIST_ERRORS: Record<WaitlistError, string> = {
  "not-found": "대기를 찾을 수 없습니다. 목록을 새로고침해주세요.",
  "closed-cafe": "폐점한 매장입니다.",
  duplicate: "같은 전화번호로 이미 대기 중입니다.",
  finished: "이미 입장·이탈로 끝난 대기입니다.",
  "invalid-transition": "지금 상태에서는 그렇게 바꿀 수 없습니다.",
  changed: "다른 직원이 먼저 이 대기를 바꿨습니다. 목록을 새로고침해 확인해주세요.",
};

/** 액션마다 서버에서 다시 권한을 확인한다. */
async function hasAccess(cafeId: string) {
  return canManageReservations(await getCurrentUser(), cafeId);
}

const revalidate = () => revalidatePath("/reservations");

export async function saveReservationAction(
  cafeId: string,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToObject(formData);
  if (!(await hasAccess(cafeId))) return formError(values, FORBIDDEN);
  const parsed = reservationInputSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);
  // 수정은 폼을 연 시점의 버전과 같을 때만 저장한다(낙관적 잠금).
  const version = parseVersion(values);
  if (id && version === null) return formError(values, STALE_FORM_MESSAGE);

  const result =
    id && version !== null
      ? await updateReservation(cafeId, id, parsed.data, version)
      : await createReservation(cafeId, parsed.data);
  if (result === "past") {
    return { status: "error", fieldErrors: { time: [RESERVATION_ERRORS.past] }, values };
  }
  if (result === "no-table" || result === "table-taken" || result === "table-too-small" || result === "table-not-found") {
    return { status: "error", fieldErrors: { table: [RESERVATION_ERRORS[result]] }, values };
  }
  if (result === "changed") {
    // 목록은 바뀐 내용으로 다시 받고, 열린 폼은 입력을 그대로 둔 채 알린다.
    revalidate();
    return formError(values, editConflictMessage("예약을"));
  }
  if (typeof result === "string") return formError(values, RESERVATION_ERRORS[result]);

  revalidate();
  return {
    status: "success",
    message: id ? `'${result.name}' 예약을 수정했습니다.` : `'${result.name}' 예약을 등록했습니다.`,
  };
}

export async function changeReservationStatusAction(
  cafeId: string,
  id: string,
  status: ReservationStatus,
): Promise<ActionResult> {
  if (!(await hasAccess(cafeId))) return { ok: false, message: FORBIDDEN };
  const parsed = reservationStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "알 수 없는 상태입니다." };
  const result = await setReservationStatus(cafeId, id, parsed.data);
  if (typeof result === "string") return { ok: false, message: RESERVATION_ERRORS[result] };
  revalidate();
  return {
    ok: true,
    message: `'${result.name}' 예약을 '${RESERVATION_STATUS_LABELS[result.status]}'(으)로 바꿨습니다.`,
  };
}

export async function addWaitlistAction(
  cafeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToObject(formData);
  if (!(await hasAccess(cafeId))) return formError(values, FORBIDDEN);
  const parsed = waitlistInputSchema.safeParse(values);
  if (!parsed.success) return formError(values, parsed.error);
  const result = await addToWaitlist(cafeId, parsed.data);
  if (result === "duplicate") {
    return { status: "error", fieldErrors: { phone: [WAITLIST_ERRORS.duplicate] }, values };
  }
  if (typeof result === "string") return formError(values, WAITLIST_ERRORS[result]);
  revalidate();
  return { status: "success", message: `대기 ${result.number}번 '${result.name}'을(를) 등록했습니다.` };
}

export async function changeWaitlistStatusAction(
  cafeId: string,
  id: string,
  status: WaitlistStatus,
): Promise<ActionResult> {
  if (!(await hasAccess(cafeId))) return { ok: false, message: FORBIDDEN };
  const parsed = waitlistStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, message: "알 수 없는 상태입니다." };
  const result = await setWaitlistStatus(cafeId, id, parsed.data);
  if (typeof result === "string") return { ok: false, message: WAITLIST_ERRORS[result] };
  revalidate();
  return {
    ok: true,
    message: `대기 ${result.number}번 '${result.name}'을(를) '${WAITLIST_STATUS_LABELS[result.status]}'(으)로 바꿨습니다.`,
  };
}
