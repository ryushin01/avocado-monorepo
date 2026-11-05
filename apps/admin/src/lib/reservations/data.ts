import "server-only";

import { connection } from "next/server";

import { getMockDb } from "@/lib/mock-db/server";
import { createWaitlistRepository } from "@/lib/waitlist/repository";
import type { WaitlistInput } from "@/lib/waitlist/schema";
import type { WaitlistStatus } from "@/lib/waitlist/types";

import { createReservationRepository } from "./repository";
import type { ReservationInput } from "./schema";
import type { ReservationStatus } from "./types";

const reservations = () => createReservationRepository(getMockDb());
const waitlist = () => createWaitlistRepository(getMockDb());

// 예약
export async function listReservations(cafeId: string, date: string) {
  await connection();
  return reservations().listByDate(cafeId, date);
}
export const createReservation = (cafeId: string, input: ReservationInput) =>
  reservations().create(cafeId, input, new Date());
export const updateReservation = (cafeId: string, id: string, input: ReservationInput) =>
  reservations().update(cafeId, id, input, new Date());
export const setReservationStatus = (cafeId: string, id: string, status: ReservationStatus) =>
  reservations().setStatus(cafeId, id, status, new Date());
export const findReservationsForKiosk = (cafeId: string, last4: string) =>
  reservations().findForKiosk(cafeId, last4, new Date());
export const checkInReservation = (cafeId: string, id: string, last4: string) =>
  reservations().checkIn(cafeId, id, last4, new Date());

// 현장 대기
/** 오늘의 현장 대기와 조회 시각(대기 시간 계산용) */
export async function listWaitlistToday(cafeId: string) {
  await connection();
  const now = new Date();
  return { entries: await waitlist().listToday(cafeId, now), now: now.getTime() };
}
export const addToWaitlist = (cafeId: string, input: WaitlistInput) =>
  waitlist().add(cafeId, input, new Date());
export const setWaitlistStatus = (cafeId: string, id: string, status: WaitlistStatus) =>
  waitlist().setStatus(cafeId, id, status, new Date());
export const countActiveWaitlist = (cafeId: string) => waitlist().countActive(cafeId);
export const findWaitlistForKiosk = (cafeId: string, last4: string) =>
  waitlist().findForKiosk(cafeId, last4);
