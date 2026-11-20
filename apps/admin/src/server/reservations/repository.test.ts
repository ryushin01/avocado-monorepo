import { describe, expect, it } from "vitest";

import type { Cafe } from "@/entities/cafe";
import { formatPhone, isMobilePhone, maskName, normalizePhone } from "@/entities/guest";
import { eq } from "drizzle-orm";

import { reservations as reservationTable } from "@/db/schema";
import { createSeedData } from "@/db/seed-data";
import { createTestDb } from "@/db/testing";
import { createWaitlistRepository } from "@/server/waitlist/repository";
import { waitlistInputSchema } from "@/entities/waitlist/index.server";

import { createReservationRepository } from "./repository";
import { onlineBookingSchema, reservationInputSchema } from "@/entities/reservation/index.server";
import { createCafeTableRepository } from "@/server/cafes/tables";
import type { New } from "@/db/mappers";
import type { Reservation } from "@/entities/reservation";

const cafe = (id: string, status: Cafe["status"] = "open"): New<Cafe> => ({ id, name: id, region: "", openedAt: "2024-01-01", status });
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

/** 지금 버전(수정 폼을 막 연 것처럼). 버전은 DB 시퀀스가 정해 미리 알 수 없다. */
async function versionOf(db: Awaited<ReturnType<typeof createTestDb>>, id: string) {
  const [row] = await db.select({ version: reservationTable.version }).from(reservationTable).where(eq(reservationTable.id, id));
  return row.version;
}

async function setup(reservations: New<Reservation>[] = []) {
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
    expect(await repo.update("a", r.id, input(), r.version, later)).toBe("finished");
    expect(await repo.setStatus("z", r.id, "seated", now)).toBe("not-found");
  });

  it("수정: 시각을 바꿀 때만 지난 시각을 막고, 확정은 가예약으로 되돌리지 않는다", async () => {
    const { db, repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T13:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    // 이미 지난 시각이지만 시각은 그대로 두고 인원만 바꿈
    expect(await repo.update("a", "r1", input({ time: "13:00", partySize: "3", status: "pending" }), await versionOf(db, "r1"), now)).toMatchObject({ partySize: 3, status: "confirmed" });
    expect(await repo.update("a", "r1", input({ time: "12:00" }), await versionOf(db, "r1"), now)).toBe("past");
    expect((await db.select().from(reservationTable))[0].memo).toBeNull();
  });

  it("수정 폼을 연 뒤 다른 직원이 고치거나 상태를 바꿨으면 덮어쓰지 않는다(낙관적 잠금)", async () => {
    const { db, repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T19:00"), status: "pending", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    // 두 직원이 같은 버전으로 연 폼에서 인원과 메모를 따로 고쳐 동시에 저장하면, 먼저 저장한 쪽만 남는다.
    const opened = await versionOf(db, "r1");
    const [a, b] = await Promise.all([
      repo.update("a", "r1", input({ partySize: "4", status: "pending" }), opened, now),
      repo.update("a", "r1", input({ memo: "창가 자리", status: "pending" }), opened, now),
    ]);
    expect([a, b].filter((r) => r === "changed")).toHaveLength(1);
    // 확정(상태 변경)도 버전을 올리므로, 그 전에 연 폼으로는 저장되지 않는다.
    const beforeConfirm = await versionOf(db, "r1");
    expect(await repo.setStatus("a", "r1", "confirmed", now)).toMatchObject({ status: "confirmed" });
    expect(await repo.update("a", "r1", input({ partySize: "6" }), beforeConfirm, now)).toBe("changed");
    // 키오스크 도착은 수정 폼이 고치는 값이 아니어서 버전을 올리지 않는다.
    const afterConfirm = await versionOf(db, "r1");
    expect(await repo.checkIn("a", "r1", "5678", now)).toMatchObject({ version: afterConfirm });
    expect(await repo.update("a", "r1", input({ partySize: "6" }), afterConfirm, now)).toMatchObject({ partySize: 6 });
    expect(await db.select().from(reservationTable)).toMatchObject([{ status: "confirmed", partySize: 6 }]);
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

  it("두 직원이 동시에 상태를 바꾸면 먼저 바꾼 쪽만 남고, 나중 쪽은 changed로 막는다", async () => {
    const { db, repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T13:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    const results = await Promise.all([repo.setStatus("a", "r1", "seated", now), repo.setStatus("a", "r1", "no_show", now)]);
    expect(results.filter((r) => r === "changed")).toHaveLength(1);
    const winner = results.find((r) => typeof r !== "string") as Reservation;
    expect((await db.select().from(reservationTable))[0].status).toBe(winner.status);
  });

  it("수정하는 사이 입장 처리됐으면 수정이 상태를 되돌리지 않는다", async () => {
    const { db, repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T19:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    // 수정 창을 연 뒤 입장 처리가 먼저 끝났다. 예전에는 수정이 읽어 둔 '확정'으로 다시 써서 입장이 사라졌다.
    const opened = await versionOf(db, "r1");
    expect(await repo.setStatus("a", "r1", "seated", now)).toMatchObject({ status: "seated" });
    expect(await repo.update("a", "r1", input({ partySize: "5" }), opened, now)).toBe("finished");
    expect(await db.select().from(reservationTable)).toMatchObject([{ status: "seated", partySize: 2 }]);

    // 동시에 들어와도 어느 순서로 처리되든 입장은 남는다(수정이 먼저면 수정한 뒤 입장).
    const { db: db2, repo: repo2 } = await setup([
      { id: "r2", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T19:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    const opened2 = await versionOf(db2, "r2");
    await Promise.all([
      repo2.setStatus("a", "r2", "seated", now),
      repo2.update("a", "r2", input({ partySize: "5" }), opened2, now),
    ]);
    expect(await db2.select().from(reservationTable)).toMatchObject([{ status: "seated" }]);
  });

  it("노쇼를 확인하는 사이 예약 시각이 미래로 바뀌면 노쇼로 처리하지 않는다", async () => {
    const { db, repo } = await setup([
      { id: "r1", cafeId: "a", name: "김철수", phone: "01012345678", partySize: 2, startsAt: at("2026-11-05T13:00"), status: "confirmed", createdAt: "2026-10-01T00:00:00.000Z" },
    ]);
    // 13시 예약의 시각 수정(19시)과 노쇼 처리가 겹친다. 노쇼는 읽어 둔 13시로 판단하므로, 그사이 시각이 바뀌었으면
    // 막아야 한다(setStatus는 읽은 상태·시각이 그대로일 때만 쓴다). 어느 쪽이 먼저든 '19시 노쇼'가 되면 안 된다.
    const opened = await versionOf(db, "r1");
    const [edited, noShow] = await Promise.all([
      repo.update("a", "r1", input({ time: "19:00" }), opened, now),
      repo.setStatus("a", "r1", "no_show", now),
    ]);
    const [row] = await db.select().from(reservationTable);
    if (typeof edited === "string") {
      // 노쇼가 먼저 끝났으면 수정은 끝난 예약이라 막힌다.
      expect([edited, row.status, row.startsAt.toISOString()]).toEqual(["finished", "no_show", at("2026-11-05T13:00")]);
    } else {
      // 노쇼가 수정 전에 읽었으면 changed, 수정 뒤에 읽었으면 19시가 아직 안 돼 too-early
      expect(["changed", "too-early"]).toContain(noShow);
      expect([row.status, row.startsAt.toISOString()]).toEqual(["confirmed", at("2026-11-05T19:00")]);
    }
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

  it("두 직원이 같은 대기를 동시에 입장·이탈로 바꾸면 나중 쪽은 changed로 막는다", async () => {
    const { waits } = await setup();
    const entry = await waits.add("a", guest("010-1111-2222"), now);
    if (typeof entry === "string") throw new Error(entry);
    const results = await Promise.all([
      waits.setStatus("a", entry.id, "seated", now),
      waits.setStatus("a", entry.id, "left", now),
    ]);
    expect(results.filter((r) => r === "changed")).toHaveLength(1);
    expect(await waits.countActive("a")).toBe(0);
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

describe("테이블 배정", () => {
  const phone = (n: number) => `010-5555-${String(n).padStart(4, "0")}`;

  it("자동 배정은 일행이 앉을 가장 작은 빈 테이블, '배정 안 함'은 비워 둔다", async () => {
    const { repo } = await setup();
    expect(await repo.create("a", input({ partySize: "3" }), now)).toMatchObject({ tableId: "t_a_B1", tableLabel: "B1" });
    expect(await repo.create("a", input({ partySize: "3", phone: phone(1) }), now)).toMatchObject({ tableLabel: "B2" });
    const unassigned = await repo.create("a", input({ table: "none" }), now);
    expect(typeof unassigned !== "string" && unassigned.tableId).toBeUndefined();
    expect((await repo.listByDate("a", "2026-11-05")).map((r) => r.tableLabel)).toEqual(["B1", "B2", undefined]);
  });

  it("고른 테이블이 작거나, 앞뒤 2시간 안에 예약이 있거나, 다른 매장·쓰지 않는 테이블이면 막는다", async () => {
    const { db, repo } = await setup();
    expect(await repo.create("a", input({ table: "t_a_A1", partySize: "3" }), now)).toBe("table-too-small");
    expect(await repo.create("a", input({ table: "t_a_B1" }), now)).toMatchObject({ tableLabel: "B1" });
    expect(await repo.create("a", input({ table: "t_a_B1", time: "20:30" }), now)).toBe("table-taken");
    expect(await repo.create("a", input({ table: "t_a_B1", time: "21:00" }), now)).toMatchObject({ tableLabel: "B1" });
    expect(await repo.create("a", input({ table: "t_b_B1" }), now)).toBe("table-not-found");
    await createCafeTableRepository(db).setActive("a", "t_a_C1", false);
    expect(await repo.create("a", input({ table: "t_a_C1" }), now)).toBe("table-not-found");
  });

  it("빈 테이블이 없으면 자동 배정은 no-table", async () => {
    const { repo } = await setup();
    for (let n = 0; n < 10; n++) {
      expect(await repo.create("a", input({ partySize: "2", phone: phone(n) }), now)).toMatchObject({ status: "confirmed" });
    }
    expect(await repo.create("a", input({ partySize: "2", phone: phone(10) }), now)).toBe("no-table");
    // 2시간 뒤에는 다시 빈다.
    expect(await repo.create("a", input({ partySize: "2", phone: phone(11), time: "21:00" }), now)).toMatchObject({ tableLabel: "A1" });
  });

  it("수정할 때 자기 자리는 겹침으로 보지 않고, 쓰지 않게 된 테이블도 원래 배정이면 유지한다", async () => {
    const { db, repo } = await setup();
    const created = await repo.create("a", input({ table: "t_a_A1", partySize: "2" }), now);
    if (typeof created === "string") throw new Error(created);
    const moved = await repo.update("a", created.id, input({ table: "t_a_A1", partySize: "2", time: "19:30" }), created.version, now);
    if (typeof moved === "string") throw new Error(moved);
    expect(moved).toMatchObject({ tableLabel: "A1", startsAt: at("2026-11-05T19:30") });

    await createCafeTableRepository(db).setActive("a", "t_a_A1", false);
    expect(await repo.update("a", created.id, input({ table: "t_a_A1", partySize: "2", memo: "창가" }), moved.version, now)).toMatchObject({
      tableLabel: "A1",
      memo: "창가",
    });
    // 다른 예약은 쓰지 않는 테이블을 새로 받을 수 없다.
    expect(await repo.create("a", input({ table: "t_a_A1", partySize: "2", time: "13:00", date: "2026-11-06" }), now)).toBe("table-not-found");
  });
});

describe("온라인 예약", () => {
  // 지금은 2026-11-05 15:00. 받는 시각: 12:00~20:00(30분 단위), 1시간 뒤부터, 11월 19일까지
  const online = (patch: Record<string, unknown> = {}) =>
    onlineBookingSchema.parse({ name: "이영희", phone: "010-2222-3333", partySize: "4", date: "2026-11-06", time: "18:00", agreed: true, ...patch });
  const oneTable = (seats = 4) => [{ id: "t1", cafeId: "a", label: "T1", seats, active: true }];

  async function setupTables(tables: ReturnType<typeof oneTable>) {
    const db = await createTestDb({ cafes: [cafe("a"), cafe("z", "closed")], games: [], inventory: [], plays: [], users: [], reservations: [], waitlist: [], tables });
    return { db, repo: createReservationRepository(db) };
  }

  it("빈 테이블을 배정해 바로 확정하고, 받은 곳을 online으로 남긴다", async () => {
    const { repo } = await setup();
    expect(await repo.book("a", online(), now)).toMatchObject({
      status: "confirmed",
      source: "online",
      tableLabel: "B1",
      partySize: 4,
      phone: "01022223333",
      startsAt: at("2026-11-06T18:00"),
    });
  });

  it("받는 시각·기간·인원이 아니거나 운영 중이 아닌 매장이면 받지 않는다", async () => {
    const { repo } = await setup();
    expect(await repo.book("a", online({ date: "2026-11-05", time: "15:30" }), now)).toBe("outside-hours");
    expect(await repo.book("a", online({ time: "18:15" }), now)).toBe("outside-hours");
    expect(await repo.book("a", online({ time: "21:00" }), now)).toBe("outside-hours");
    expect(await repo.book("a", online({ date: "2026-11-20" }), now)).toBe("outside-hours");
    expect(await repo.book("a", { ...online(), partySize: 9 }, now)).toBe("too-many");
    expect(await repo.book("z", online(), now)).toBe("closed-cafe");
    expect(await repo.book("a", online({ date: "2026-11-05", time: "16:00" }), now)).toMatchObject({ status: "confirmed" });
  });

  it("같은 번호로 그날 이 매장에 끝나지 않은 예약이 있으면 duplicate", async () => {
    const { repo } = await setup();
    expect(await repo.book("a", online(), now)).toMatchObject({ status: "confirmed" });
    expect(await repo.book("a", online({ time: "13:00" }), now)).toBe("duplicate");
    expect(await repo.book("a", online({ partySize: "2" }), now)).toBe("duplicate");
    expect(await repo.book("b", online(), now)).toMatchObject({ status: "confirmed" });
    expect(await repo.book("a", online({ date: "2026-11-07" }), now)).toMatchObject({ status: "confirmed" });
  });

  it("같은 내용(번호·매장·시각·인원)으로 다시 보내면 새로 만들지 않고 이미 된 예약을 돌려준다(응답을 못 받은 손님의 재전송)", async () => {
    const { db, repo } = await setup();
    const first = await repo.book("a", online(), now);
    if (typeof first === "string") throw new Error(first);
    expect(await repo.book("a", online({ name: "이영희", memo: "다시 보냄" }), now)).toMatchObject({ id: first.id, tableLabel: first.tableLabel });
    expect(await db.select().from(reservationTable)).toHaveLength(1);
  });

  it("남은 테이블이 하나일 때 두 건이 동시에 와도 한 건만 받는다", async () => {
    const { db, repo } = await setupTables(oneTable());
    const results = await Promise.all([
      repo.book("a", online({ phone: "010-1111-0001" }), now),
      repo.book("a", online({ phone: "010-1111-0002", time: "19:00" }), now),
    ]);
    expect(results.filter((r) => r === "full")).toHaveLength(1);
    expect(await db.select().from(reservationTable)).toHaveLength(1);
  });

  it("빈 시각: 일행이 앉을 테이블이 있는 받는 시각만 available", async () => {
    const { repo } = await setupTables(oneTable());
    expect(await repo.book("a", online(), now)).toMatchObject({ tableLabel: "T1" });
    const day = await repo.availability("a", "2026-11-06", 4, now);
    const open = day?.slots.filter((s) => s.available).map((s) => s.time);
    // 18시 예약이 16:01~19:59 시작을 막는다.
    expect(open).toEqual(["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "20:00"]);
    expect((await repo.availability("a", "2026-11-06", 5, now))?.slots.some((s) => s.available)).toBe(false);
    // 오늘은 1시간 뒤(16시)부터
    expect((await repo.availability("a", "2026-11-05", 2, now))?.slots.find((s) => s.available)?.time).toBe("16:00");
    expect(await repo.availability("z", "2026-11-06", 2, now)).toBeNull();
  });
});
