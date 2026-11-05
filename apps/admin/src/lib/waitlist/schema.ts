import { z } from "zod";

import { guestName, guestPhone, partySize } from "@/lib/reservations/schema";

import { WAITLIST_STATUSES } from "./types";

/** 대기 등록 (키오스크·백오피스 공통) */
export const waitlistInputSchema = z.object({ name: guestName, phone: guestPhone, partySize });
export type WaitlistInput = z.infer<typeof waitlistInputSchema>;

export const waitlistStatusSchema = z.enum(WAITLIST_STATUSES, { error: "알 수 없는 상태입니다." });
