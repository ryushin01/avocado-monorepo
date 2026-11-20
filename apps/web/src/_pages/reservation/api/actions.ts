"use server";

import type { BookingResult, BookingSlot } from "@avocado/domain/booking";

import { fetchBookingAvailability, submitBooking } from "@/shared/api";

export type BookingFormValues = { time: string; name: string; phone: string; memo: string; agreed: boolean };

export type BookingFormState =
  | { status: "idle" }
  | { status: "success"; reservation: BookingResult["reservation"] }
  | {
      status: "error";
      message: string;
      /** 칸별 오류. 고칠 칸이 없으면 비어 있고 message를 알림 영역에 보인다. */
      fieldErrors: Record<string, string[]>;
      /** 다시 그린 폼에 되살릴 입력값 */
      values: BookingFormValues;
      /** 그사이 자리가 찼을 때 새로 받은 빈 시각 */
      slots?: BookingSlot[];
      /** 보낼 때마다 늘어 폼을 다시 그린다(입력값을 되살리기 위해) */
      attempt: number;
    };

const UNREACHABLE = "지금은 예약을 받을 수 없습니다. 잠시 후 다시 시도하시거나 매장으로 전화해 주세요.";

/** 온라인 예약 보내기. 입력 검증과 테이블 배정은 백오피스가 하고, 여기서는 결과를 화면 상태로 바꾼다. */
export async function bookAction(prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const cafeId = text("cafe");
  const date = text("date");
  const partySize = Number(text("partySize"));
  const values: BookingFormValues = {
    time: text("time"),
    name: text("name"),
    phone: text("phone"),
    memo: text("memo"),
    agreed: formData.get("agreed") !== null,
  };
  const attempt = (prev.status === "error" ? prev.attempt : 0) + 1;

  const result = await submitBooking(cafeId, {
    date,
    time: values.time,
    partySize,
    name: values.name,
    phone: values.phone,
    memo: values.memo || undefined,
    agreed: values.agreed,
  });
  if (result.ok) return { status: "success", reservation: result.data.reservation };
  if (result.reason !== "rejected" || !result.error) {
    return { status: "error", message: UNREACHABLE, fieldErrors: {}, values, attempt };
  }

  const { code, message, fieldErrors = {} } = result.error;
  if (code !== "full") return { status: "error", message, fieldErrors, values, attempt };
  // 그사이 다른 손님이 그 시각을 가져갔다. 빈 시각을 새로 받아 보여 주고 고른 시각은 비운다.
  const fresh = await fetchBookingAvailability(cafeId, date, partySize);
  return {
    status: "error",
    message,
    fieldErrors,
    values: { ...values, time: "" },
    slots: fresh.ok ? fresh.data.slots : undefined,
    attempt,
  };
}
