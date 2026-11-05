"use server";

import {
  checkInReservation,
  fetchWaitlist,
  joinWaitlist,
  lookupReservations,
} from "./backoffice";
import type { KioskWaitlistEntry } from "@avocado/domain/kiosk";

// 손님 화면의 서버 액션. 백오피스 주소·토큰은 서버에만 두고 여기서 대신 부른다.
// 입력 검증은 백오피스 API가 다시 한다.

const PHONE4 = /^\d{4}$/;

export async function lookupReservationsAction(phone4: string) {
  if (!PHONE4.test(phone4)) return { ok: false as const, reason: "rejected" as const };
  return lookupReservations(phone4);
}

export async function checkInAction(id: string, phone4: string) {
  if (!PHONE4.test(phone4)) return { ok: false as const, reason: "rejected" as const };
  return checkInReservation(id, phone4);
}

export async function lookupWaitlistAction(phone4: string) {
  if (!PHONE4.test(phone4)) return { ok: false as const, reason: "rejected" as const };
  return fetchWaitlist(phone4);
}

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors: Partial<Record<string, string[]>>; values: Record<string, string> }
  | { status: "done"; entry: KioskWaitlistEntry };

export async function joinWaitlistAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    partySize: String(formData.get("partySize") ?? "2"),
  };
  const result = await joinWaitlist({ ...values, partySize: Number(values.partySize) });
  if (result.ok) return { status: "done", entry: result.data.entry };
  return {
    status: "error",
    message:
      result.reason === "rejected"
        ? (result.error?.message ?? "입력을 확인해주세요.")
        : "매장 시스템에 연결할 수 없습니다. 직원에게 문의해주세요.",
    fieldErrors: result.error?.fieldErrors ?? {},
    values,
  };
}
