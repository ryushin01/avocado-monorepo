"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/server/auth/current-user";
import { canManageReservations } from "@/entities/user";
import {
  formDataToObject,
  formError,
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
import { reservationInputSchema, reservationStatusSchema } from "@/entities/reservation/schema";
import type { WaitlistError } from "@/server/waitlist/repository";
import { WAITLIST_STATUS_LABELS, type WaitlistStatus } from "@/entities/waitlist";
import { waitlistInputSchema, waitlistStatusSchema } from "@/entities/waitlist/schema";

const FORBIDDEN = "이 매장의 예약·대기를 관리할 권한이 없습니다.";

const RESERVATION_ERRORS: Record<ReservationError, string> = {
  "not-found": "예약을 찾을 수 없습니다. 목록을 새로고침해주세요.",
  "closed-cafe": "폐점한 매장입니다.",
  past: "지난 시각으로는 예약할 수 없습니다.",
  finished: "이미 입장·취소·노쇼로 끝난 예약입니다.",
  "invalid-transition": "지금 상태에서는 그렇게 바꿀 수 없습니다.",
  "too-early": "예약 시각이 지나야 노쇼로 처리할 수 있습니다.",
};

const WAITLIST_ERRORS: Record<WaitlistError, string> = {
  "not-found": "대기를 찾을 수 없습니다. 목록을 새로고침해주세요.",
  "closed-cafe": "폐점한 매장입니다.",
  duplicate: "같은 전화번호로 이미 대기 중입니다.",
  finished: "이미 입장·이탈로 끝난 대기입니다.",
  "invalid-transition": "지금 상태에서는 그렇게 바꿀 수 없습니다.",
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

  const result = id
    ? await updateReservation(cafeId, id, parsed.data)
    : await createReservation(cafeId, parsed.data);
  if (result === "past") {
    return { status: "error", fieldErrors: { time: [RESERVATION_ERRORS.past] }, values };
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
