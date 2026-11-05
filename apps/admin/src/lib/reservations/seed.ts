import type { Cafe } from "@/lib/cafes/types";
import { hash01 } from "@/lib/hash";
import { DAY, startOfKstDay } from "@/lib/plays/time";
import type { WaitlistEntry } from "@/lib/waitlist/types";

import type { Reservation, ReservationStatus } from "./types";

const HOUR = 3_600_000;
const MINUTE = 60_000;

// 지어낸 손님. 전화번호는 실제로 쓰이지 않는 010-0000-xxxx 형식이다.
const NAMES = ["김민준", "이서연", "박지호", "최수아", "정예준", "강하은", "윤도윤", "임지유", "한시우", "오서윤", "서주원", "신하린"];
const fakePhone = (key: string) => `0100000${String(Math.floor(hash01(key) * 10000)).padStart(4, "0")}`;
const pick = (key: string) => NAMES[Math.floor(hash01(key) * NAMES.length)];

/**
 * 매장마다 오늘과 내일의 예약을 만든다(now 기준, 매번 같은 결과).
 * 오늘 이미 지난 시각의 예약은 입장 또는 노쇼, 앞으로의 예약은 확정 또는 가예약이다.
 */
export function createSeedReservations(cafes: Cafe[], now = new Date()): Reservation[] {
  const today = startOfKstDay(now.getTime());
  const list: Reservation[] = [];
  for (const cafe of cafes) {
    if (cafe.status !== "open") continue;
    // 오늘 13·15·17·19·20시, 내일 14·18시
    const slots = [13, 15, 17, 19, 20].map((h) => today + h * HOUR).concat([14, 18].map((h) => today + DAY + h * HOUR));
    slots.forEach((start, i) => {
      const key = `${cafe.id}:res:${i}`;
      const past = start < now.getTime();
      const status: ReservationStatus = past
        ? hash01(`${key}:s`) < 0.8
          ? "seated"
          : "no_show"
        : hash01(`${key}:s`) < 0.75
          ? "confirmed"
          : "pending";
      list.push({
        id: `r_${list.length + 1}`,
        cafeId: cafe.id,
        name: pick(key),
        phone: fakePhone(key),
        partySize: 2 + Math.floor(hash01(`${key}:p`) * 5),
        startsAt: new Date(start + (hash01(`${key}:m`) < 0.5 ? 0 : 30 * MINUTE)).toISOString(),
        status,
        createdAt: new Date(today - DAY).toISOString(),
        closedAt: past ? new Date(start + 15 * MINUTE).toISOString() : undefined,
      });
    });
  }
  return list;
}

/** 매장마다 오늘의 현장 대기: 입장 1팀, 호출 1팀, 대기 2팀 */
export function createSeedWaitlist(cafes: Cafe[], now = new Date()): WaitlistEntry[] {
  const list: WaitlistEntry[] = [];
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MINUTE).toISOString();
  for (const cafe of cafes) {
    if (cafe.status !== "open") continue;
    const plan: { status: WaitlistEntry["status"]; minutesAgo: number }[] = [
      { status: "seated", minutesAgo: 50 },
      { status: "called", minutesAgo: 30 },
      { status: "waiting", minutesAgo: 18 },
      { status: "waiting", minutesAgo: 6 },
    ];
    plan.forEach(({ status, minutesAgo }, i) => {
      const key = `${cafe.id}:wait:${i}`;
      list.push({
        id: `w_${list.length + 1}`,
        cafeId: cafe.id,
        number: i + 1,
        name: pick(key),
        phone: fakePhone(key),
        partySize: 1 + Math.floor(hash01(`${key}:p`) * 4),
        createdAt: at(minutesAgo),
        status,
        calledAt: status === "waiting" ? undefined : at(minutesAgo - 5),
        closedAt: status === "seated" ? at(minutesAgo - 10) : undefined,
      });
    });
  }
  return list;
}
