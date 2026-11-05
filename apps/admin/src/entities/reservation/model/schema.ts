import { z } from "zod";

import { firstParam } from "@/shared/lib/search-params";
import { isMobilePhone, normalizePhone } from "@/entities/guest/@x/reservation";

import { RESERVATION_STATUSES } from "./types";

export const guestName = z
  .string({ error: "이름을 입력해주세요." })
  .trim()
  .min(1, "이름을 입력해주세요.")
  .max(20, "이름은 20자 이하여야 합니다.");

export const guestPhone = z
  .string({ error: "전화번호를 입력해주세요." })
  .transform(normalizePhone)
  .refine(isMobilePhone, "휴대전화 번호를 010-1234-5678 형식으로 입력해주세요.");

export const partySize = z.coerce
  .number({ error: "인원을 입력해주세요." })
  .int("인원은 정수여야 합니다.")
  .min(1, "인원은 1명 이상이어야 합니다.")
  .max(20, "인원은 20명 이하여야 합니다.");

/** 백오피스 예약 등록·수정 폼. 날짜·시각은 한국 시간으로 받는다. */
export const reservationInputSchema = z
  .object({
    name: guestName,
    phone: guestPhone,
    partySize,
    date: z.iso.date({ error: "날짜를 입력해주세요." }),
    time: z
      .string({ error: "시각을 입력해주세요." })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시각을 입력해주세요."),
    memo: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().max(100, "메모는 100자 이하여야 합니다.").optional(),
    ),
    status: z.enum(["pending", "confirmed"], { error: "상태를 선택해주세요." }).default("confirmed"),
  })
  .transform(({ date, time, ...rest }) => ({
    ...rest,
    startsAt: new Date(`${date}T${time}:00+09:00`).toISOString(),
  }));

export type ReservationInput = z.infer<typeof reservationInputSchema>;

export const reservationStatusSchema = z.enum(RESERVATION_STATUSES, {
  error: "알 수 없는 상태입니다.",
});

/** 목록 날짜(YYYY-MM-DD). 없거나 잘못되면 undefined (화면이 오늘로 정함) */
export function parseReservationDate(params: Record<string, string | string[] | undefined>) {
  const date = z.iso.date().safeParse(firstParam(params.date));
  return date.success ? date.data : undefined;
}

/** 키오스크 조회: 전화번호 뒷자리 4자리 */
export const phoneLast4Schema = z.string().regex(/^\d{4}$/, "전화번호 뒷자리 4자리를 입력해주세요.");
