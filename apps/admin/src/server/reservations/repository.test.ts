import { describe, expect, it } from "vitest";

import type { Cafe } from "@/entities/cafe";
import { formatPhone, isMobilePhone, maskName, normalizePhone } from "@/entities/guest";
import { reservations as reservationTable } from "@/db/schema";
import { createSeedData } from "@/db/seed-data";
import { createTestDb } from "@/db/testing";
import { createWaitlistRepository } from "@/server/waitlist/repository";
import { waitlistInputSchema } from "@/entities/waitlist/schema";

import { createReservationRepository } from "./repository";
import { reservationInputSchema } from "@/entities/reservation/schema";
import type { Reservation } from "@/entities/reservation";

const cafe = (id: string, status: Cafe["status"] = "open"): Cafe => ({ id, name: id, region: "", openedAt: "2024-01-01", status });
// 지금: 2026-11-05 15:00 (한국)
const now = new Date("2026-11-05T06:00:00.000Z");
const at = (kst: string) => new Date(`${kst}:00+09:00`).toISOString();

const input = (patch: Record<string, string> = {}) =>
  reservationInputSchema.parse({
    name: "김철수",
    phone: "010-1234-5678",
    partySize: "4",
    date: "2026-11-05",
    time: "19:00",
    ...patch,
  });

async function setup(reservations: Reservation[] = []) {
  const db = await createTestDb({
    cafes: [cafe("a"), cafe("b"), cafe("z", "closed")],
    games: [],
    inventory: [],
    plays: [],
    users: [],
    reservations,
    waitlist: [],
  });
  return { db, repo: createReservationRepository(db), waits: createWaitlistRepository(db) };
}

describe("guests/contact", () => {
  it("전화번호는 숫자만 남겨 휴대전화인지 보고, 하이픈을 넣어 보여준다", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(isMobilePhone("01012345678")).toBe(true);
    expect(isMobilePhone("0212345678")).toBe(false);
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
  });
  it("이름은 첫 글자와 끝 글자만 남긴다", () => {
    expect(["김철수", "김수", "남궁민수", "A"].map(maskName)).toEqual(["김*수", "김*", "남**수", "A"]);
  });
});

describe("reservationInputSchema", () => {
  it("날짜·시각(한국 시간)을 하나의 시각으로 합치고 기본은 확정이다", () => {
    expect(input()).toMatchObject({
      phone: "01012345678",
      partySize: 4,
      startsAt: "2026-11-05T10:00:00.000Z",
      status: "confirmed",
    });
    const bad = reservationInputSchema.safeParse({ name: "", phone: "123", partySize: "0", date: "x", time: "25:00" });
    expect(Object.keys(bad.error!.flatten().fieldErrors).sort()).toEqual(["date", "name", "partySize", "phone", "time"]);
  });
});

describe("ReservationRepository", () => {
  it("등록: 운영 중인 매장에 지금 이후로만, 날짜별로 시각순", async () => {
    const { repo } = await setup();
    expect(await repo.create("a", input({ time: "14:00" }), now)).toBe("past");
    expect(await repo.create("z", input(), now)).toBe("closed-cafe");
    await repo.create("a", input({ time: "20:00" }), now);
    await repo.create("a", input({ time: "16:00", name: "이영희" }), now);
    await repo.create("a", input({ date: "2026-11-06" }), now);
    expect((await repo.listByDate("a", "2026-11-05")).map((r) => r.name)).toEqual(["이영희", "김철수"]);
  });

  it("상태 변경: 정해진 순서만, 끝난 예약은 못 바꾸고, 노쇼는 예약 시각 뒤에만", async () => {
    const { repo } = await setup();
    const r = await repo.create("a", input({ status: "pending" }), now);
    if (typeof r === "string") throw new Error(r);
    expect(await repo.setStatus("a", r.id, "no_show", now)).toBe("too-early");
    expect(await repo.setStatus("a", r.id, "confirmed", now)).toMatchObject({ status: "confirmed" });
    expect(await repo.setStatus("a", r.id, "pending", now)).toBe("invalid-transition");
    const later = new Date("2026-11-05T11:00:00.000Z"); // 20시
    expect(await repo.setStatus("a", r.id, "no_show", later)).toMatchObject({ status: "no_show", closedAt: later.toISOString() });
    expect(await repo.setStatus("a", r.id, "seated", later)).toBe("finished");
    expect(await repo.update("a", r.id, input(), later)).toBe("finished");
    expect(await repo.setStatus("z", r.id, "seated", now)).toBe("not-found");
  });

  it("수정: 시각을 바꿀 때만 지난 시각을 막고, 확정은 가예약으로 되돌리지 않는다", async () => {
    const { db, repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T13:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    // 이미 지난 시각이지만 시각은 그대로 두고 인원만 바꿈
    expect(await repo.update("a", "r1", input({ time: "13:00", partySize: "3", status: "pending" }), now)).toMatchObject({ partySize: 3, status: "confirmed" });
    expect(await repo.update("a", "r1", input({ time: "12:00" }), now)).toBe("past");
    expect((await db.select().from(reservationTable))[0].memo).toBeNull();
  });

  it("키오스크: 오늘 끝나지 않은 예약만 뒷자리로 찾고, 도착을 알릴 수 있다", async () => {
    const { repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T18:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "r2", cafeId: "a", name: "박영수", phone: "01099995678", partySize: 4, startsAt: at("2026-11-05T13:00"), status: "seated", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "r3", cafeId: "a", name: "최민지", phone: "01011115678", partySize: 3, startsAt: at("2026-11-06T18:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
      { id: "r4", cafeId: "b", name: "정우성", phone: "01022225678", partySize: 2, startsAt: at("2026-11-05T18:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    expect((await repo.findForKiosk("a", "5678", now)).map((r) => r.id)).toEqual(["r1"]);
    expect(await repo.checkIn("a", "r1", "0000", now)).toBe("not-found");
    expect(await repo.checkIn("a", "r3", "5678", now)).toBe("not-found"); // 내일 예약
    expect(await repo.checkIn("a", "r1", "5678", now)).toMatchObject({ arrivedAt: now.toISOString() });
  });
});

describe("WaitlistRepository", () => {
  const guest = (phone: string, name = "김철수") => waitlistInputSchema.parse({ name, phone, partySize: "2" });

  it("자정이 지나도 줄에 남은 손님과 번호가 겹치지 않는다", async () => {
    const { waits } = await setup();
    const beforeMidnight = new Date("2026-11-05T14:50:00.000Z"); // 한국 23:50
    const afterMidnight = new Date("2026-11-05T15:10:00.000Z"); // 한국 00:10
    await waits.add("a", guest("010-1111-2222"), beforeMidnight);
    await waits.add("a", guest("010-3333-4444"), beforeMidnight);

    expect(await waits.add("a", guest("010-5555-6666"), afterMidnight)).toMatchObject({ number: 3, ahead: 2 });
    expect(await waits.add("a", guest("010-7777-8888"), afterMidnight)).toMatchObject({ number: 4, ahead: 3 });
    // 다른 매장의 번호는 따로 셉니다.
    expect(await waits.add("b", guest("010-9999-0000"), afterMidnight)).toMatchObject({ number: 1 });
  });

  it("줄이 비면 다음 날 번호는 1번부터 다시 시작한다", async () => {
    const { waits } = await setup();
    const before = new Date("2026-11-05T14:50:00.000Z");
    const entry = await waits.add("a", guest("010-1111-2222"), before);
    if (typeof entry === "string") throw new Error(entry);
    await waits.setStatus("a", entry.id, "seated", before);

    expect(await waits.add("a", guest("010-3333-4444"), new Date("2026-11-05T15:10:00.000Z"))).toMatchObject({ number: 1 });
  });

  it("등록하면 그날 번호를 매기고 앞에 남은 팀 수를 알려주며, 같은 번호로 두 번은 못 선다", async () => {
    const { waits } = await setup();
    expect(await waits.add("a", guest("010-1111-2222"), now)).toMatchObject({ number: 1, ahead: 0 });
    expect(await waits.add("a", guest("010-3333-4444"), now)).toMatchObject({ number: 2, ahead: 1 });
    expect(await waits.add("a", guest("01011112222"), now)).toBe("duplicate");
    expect(await waits.add("z", guest("010-5555-6666"), now)).toBe("closed-cafe");
  });

  it("호출·입장·이탈 순서를 지키고, 줄에서 빠지면 뒤 팀의 순서가 당겨진다", async () => {
    const { waits } = await setup();
    const first = await waits.add("a", guest("010-1111-2222"), now);
    await waits.add("a", guest("010-3333-4444", "이영희"), new Date(now.getTime() + 1000));
    if (typeof first === "string") throw new Error(first);
    expect(await waits.setStatus("a", first.id, "called", now)).toMatchObject({ status: "called", calledAt: now.toISOString() });
    expect(await waits.setStatus("a", first.id, "waiting", now)).toBe("invalid-transition");
    expect((await waits.findForKiosk("a", "4444"))[0]).toMatchObject({ number: 2, ahead: 1 });
    expect(await waits.setStatus("a", first.id, "seated", now)).toMatchObject({ status: "seated" });
    expect(await waits.setStatus("a", first.id, "left", now)).toBe("finished");
    expect((await waits.findForKiosk("a", "4444"))[0].ahead).toBe(0);
    expect(await waits.countActive("a")).toBe(1);
  });
});

describe("시드", () => {
  it("운영 중인 매장마다 오늘·내일 예약과 오늘 대기가 있고, 지난 예약은 끝나 있다", () => {
    const db = createSeedData({ plays: [] }, now);
    for (const c of db.cafes) {
      expect(db.reservations.filter((r) => r.cafeId === c.id)).toHaveLength(7);
      expect(db.waitlist.filter((w) => w.cafeId === c.id && w.status === "waiting")).toHaveLength(2);
    }
    for (const r of db.reservations) {
      const done = ["seated", "no_show"].includes(r.status);
      expect(done).toBe(Date.parse(r.startsAt) < now.getTime() - 30 * 60_000 ? true : done);
      expect(isMobilePhone(r.phone)).toBe(true);
    }
  });
});
