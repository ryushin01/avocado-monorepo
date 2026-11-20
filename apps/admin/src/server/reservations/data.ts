import "server-only";

import { connection } from "next/server";

import { getDb } from "@/db/server";
import { createWaitlistRepository } from "@/server/waitlist/repository";
import type { WaitlistInput, WaitlistStatus } from "@/entities/waitlist";

import { createReservationRepository } from "./repository";
import type { OnlineBookingInput, ReservationInput, ReservationStatus } from "@/entities/reservation";

const reservations = async () => createReservationRepository(await getDb());
const waitlist = async () => createWaitlistRepository(await getDb());

// 예약
export async function listReservations(cafeId: string, date: string) {
  await connection();
  return (await reservations()).listByDate(cafeId, date);
}
export const createReservation = async (cafeId: string, input: ReservationInput) =>
  (await reservations()).create(cafeId, input, new Date());
export const updateReservation = async (cafeId: string, id: string, input: ReservationInput, version: number) =>
  (await reservations()).update(cafeId, id, input, version, new Date());
export const setReservationStatus = async (cafeId: string, id: string, status: ReservationStatus) =>
  (await reservations()).setStatus(cafeId, id, status, new Date());
export const findReservationsForKiosk = async (cafeId: string, last4: string) =>
  (await reservations()).findForKiosk(cafeId, last4, new Date());
export const checkInReservation = async (cafeId: string, id: string, last4: string) =>
  (await reservations()).checkIn(cafeId, id, last4, new Date());

// 손님 온라인 예약(홍보 사이트 → 예약 API)
export const bookOnline = async (cafeId: string, input: OnlineBookingInput) =>
  (await reservations()).book(cafeId, input, new Date());
export async function bookingAvailability(cafeId: string, date: string, partySize: number) {
  await connection();
  return (await reservations()).availability(cafeId, date, partySize, new Date());
}

// 현장 대기
/** 오늘의 현장 대기와 조회 시각(대기 시간 계산용) */
export async function listWaitlistToday(cafeId: string) {
  await connection();
  const now = new Date();
  return { entries: await (await waitlist()).listToday(cafeId, now), now: now.getTime() };
}
export const addToWaitlist = async (cafeId: string, input: WaitlistInput) =>
  (await waitlist()).add(cafeId, input, new Date());
export const setWaitlistStatus = async (cafeId: string, id: string, status: WaitlistStatus) =>
  (await waitlist()).setStatus(cafeId, id, status, new Date());
export const countActiveWaitlist = async (cafeId: string) =>
  (await waitlist()).countActive(cafeId);
export const findWaitlistForKiosk = async (cafeId: string, last4: string) =>
  (await waitlist()).findForKiosk(cafeId, last4);
