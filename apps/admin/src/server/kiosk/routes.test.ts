import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  KioskApiErrorSchema,
  KioskCafeGamesSchema,
  KioskCheckInResultSchema,
  KioskReservationLookupSchema,
  KioskWaitlistJoinResultSchema,
  KioskWaitlistStatusSchema,
} from "@avocado/domain/kiosk";

import type { Database } from "@/db/index";
import { createTestDb } from "@/db/testing";
import { reservationInputSchema } from "@/entities/reservation/index.server";
import { createReservationRepository } from "@/server/reservations/repository";

// 키오스크 API 라우트를 실제 메모리 DB(개발용 시드)와 함께 부른다. 화면 다시 그리기·요청 시점 표시만 가짜로 둔다.
const state = vi.hoisted(() => ({ db: undefined as Database | undefined, revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: state.revalidatePath }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/db/server", () => ({
  getDb: async () => {
    if (!state.db) throw new Error("테스트 DB가 없습니다.");
    return state.db;
  },
}));

import { GET as getGames } from "./routes/games";
import { POST as postCheckIn } from "./routes/check-in";
import { GET as getReservations } from "./routes/reservations";
import { GET as getWaitlist, POST as postWaitlist } from "./routes/waitlist";

const CAFE = "c_dunsan";
const TOKEN = `kio_dev_${CAFE}`;
const request = (path: string, init: { token?: string | null; body?: unknown } = {}) =>
  new Request(`http://localhost${path}`, {
    method: init.body === undefined ? "GET" : "POST",
    headers: init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` },
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
const ctx = (cafeId = CAFE) => ({ params: Promise.resolve({ cafeId }) });
const errorOf = async (res: Response) => KioskApiErrorSchema.parse(await res.json());

beforeAll(async () => {
  state.db = await createTestDb();
}, 60_000);
beforeEach(() => vi.stubEnv("NODE_ENV", "production"));
afterEach(() => {
  vi.unstubAllEnvs();
  state.revalidatePath.mockClear();
});

describe("키오스크 API 인증", () => {
  it("운영에서는 토큰이 없으면 401, 다른 매장 토큰은 403, 없는 토큰은 401", async () => {
    expect((await getGames(request("/g", { token: null }), ctx())).status).toBe(401);
    const other = await getGames(request("/g", { token: "kio_dev_c_gangnam" }), ctx());
    expect(other.status).toBe(403);
    expect((await errorOf(other)).message).toBe("이 매장의 키오스크가 아닙니다.");
    expect((await getGames(request("/g", { token: "kio_nope" }), ctx())).status).toBe(401);
  });

  it("개발 중에는 토큰 없이도 읽을 수 있다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await getGames(request("/g", { token: null }), ctx())).status).toBe(200);
  });

  it("운영 중이 아닌 매장은 404", async () => {
    const res = await getWaitlist(request("/w", { token: null }), ctx("c_none"));
    expect(res.status).toBe(401);
    vi.stubEnv("NODE_ENV", "development");
    const missing = await getWaitlist(request("/w", { token: null }), ctx("c_none"));
    expect(missing.status).toBe(404);
    expect((await errorOf(missing)).message).toBe("운영 중인 매장이 아닙니다.");
  });
});

describe("보유 게임", () => {
  it("매장 이름과 게임 목록을 약속한 모양으로 돌려주고 캐시하지 않는다", async () => {
    const res = await getGames(request("/g"), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = KioskCafeGamesSchema.parse(await res.json());
    expect(body.cafe).toEqual({ id: CAFE, name: "대전 둔산점" });
    expect(body.games.length).toBeGreaterThan(0);
  });
});

describe("대기", () => {
  it("등록하면 번호를 받고, 대기 팀 수와 내 순서에 보인다. 같은 번호로 또 등록하면 409", async () => {
    const before = KioskWaitlistStatusSchema.parse(await (await getWaitlist(request("/w"), ctx())).json());
    const join = await postWaitlist(request("/w", { body: { name: "김대기", phone: "010-0000-7788", partySize: 2 } }), ctx());
    expect(join.status).toBe(200);
    const { entry } = KioskWaitlistJoinResultSchema.parse(await join.json());
    expect(entry.partySize).toBe(2);
    expect(state.revalidatePath).toHaveBeenCalledWith("/reservations");

    const after = KioskWaitlistStatusSchema.parse(await (await getWaitlist(request("/w?phone4=7788"), ctx())).json());
    expect(after.waitingTeams).toBe(before.waitingTeams + 1);
    expect(after.mine.map((m) => m.number)).toEqual([entry.number]);

    const again = await postWaitlist(request("/w", { body: { name: "김대기", phone: "010-0000-7788", partySize: 2 } }), ctx());
    expect(again.status).toBe(409);
    expect((await errorOf(again)).fieldErrors?.phone).toEqual(["이 전화번호로 이미 대기 중입니다."]);
  });

  it("잘못 쓴 칸은 칸별 오류로, JSON이 아닌 본문·잘못된 뒷자리는 400으로 알린다", async () => {
    const bad = await postWaitlist(request("/w", { body: { name: "", phone: "12", partySize: 0 } }), ctx());
    expect(bad.status).toBe(400);
    const error = await errorOf(bad);
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(expect.arrayContaining(["name", "phone", "partySize"]));
    expect((await postWaitlist(request("/w", { body: "{" }), ctx())).status).toBe(400);
    expect((await getWaitlist(request("/w?phone4=12"), ctx())).status).toBe(400);
  });
});

describe("예약 확인과 도착", () => {
  // 오늘 남은 시각에만 예약할 수 있어서, 한국 시간 밤 11시 이후에는 건너뛴다.
  const kst = new Date(Date.now() + 9 * 3_600_000);
  it.skipIf(kst.getUTCHours() >= 23)("뒷자리로 오늘 예약을 찾고, 도착을 알리면 이름을 가려 돌려준다. 뒷자리가 틀리면 404", async () => {
    const input = reservationInputSchema.parse({
      name: "박도착",
      phone: "010-0000-4455",
      partySize: 3,
      date: kst.toISOString().slice(0, 10),
      time: `${String(kst.getUTCHours() + 1).padStart(2, "0")}:00`,
      table: "none",
    });
    const created = await createReservationRepository(state.db!).create(CAFE, input, new Date());
    expect(typeof created).not.toBe("string");

    const lookup = await getReservations(request("/r?phone4=4455"), ctx());
    const { reservations } = KioskReservationLookupSchema.parse(await lookup.json());
    const mine = reservations.find((r) => r.maskedName === "박*착");
    expect(mine).toBeDefined();

    const params = { params: Promise.resolve({ cafeId: CAFE, id: mine!.id }) };
    const wrong = await postCheckIn(request("/c", { body: { phone4: "0000" } }), params);
    expect(wrong.status).toBe(404);

    const ok = await postCheckIn(request("/c", { body: { phone4: "4455" } }), params);
    expect(ok.status).toBe(200);
    expect(KioskCheckInResultSchema.parse(await ok.json()).reservation.arrived).toBe(true);
    expect(state.revalidatePath).toHaveBeenCalledWith("/reservations");

    expect((await postCheckIn(request("/c", { body: {} }), params)).status).toBe(400);
    expect((await getReservations(request("/r?phone4=abcd"), ctx())).status).toBe(400);
  });
});
