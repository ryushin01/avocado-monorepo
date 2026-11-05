import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTestDb } from "@/db/testing";

import { checkKioskAccess } from "./auth";
import {
  createKioskDeviceRepository,
  devKioskToken,
  hashKioskToken,
  type KioskVerifyResult,
} from "./devices";

const now = new Date("2026-11-05T06:00:00.000Z");
const light = { plays: [], reservations: [], waitlist: [], users: [] };

describe("KioskDeviceRepository", () => {
  it("발급하면 토큰 원문은 한 번만 돌려주고, 저장된 것은 해시뿐이다", async () => {
    const db = await createTestDb(light, now);
    const repo = createKioskDeviceRepository(db);
    const issued = await repo.issue("c_dunsan", "입구 태블릿", now);
    if (typeof issued === "string") throw new Error(issued);
    expect(issued.token).toMatch(/^kio_[\w-]{32}$/);
    expect(issued.device.tokenPrefix).toBe(`${issued.token.slice(0, 8)}…`);
    expect(JSON.stringify(await repo.list("c_dunsan"))).not.toContain(issued.token);
    expect(await repo.verify(issued.token, "c_dunsan", now)).toBe("ok");
    expect(hashKioskToken(issued.token)).toHaveLength(64);
  });

  it("다른 매장 주소로 쓰면 wrong-cafe, 폐기하면 invalid, 폐점 매장에는 발급하지 않는다", async () => {
    const db = await createTestDb(light, now);
    const repo = createKioskDeviceRepository(db);
    const issued = await repo.issue("c_dunsan", "카운터", now);
    if (typeof issued === "string") throw new Error(issued);
    expect(await repo.verify(issued.token, "c_gangnam", now)).toBe("wrong-cafe");
    expect(await repo.verify("kio_nope", "c_dunsan", now)).toBe("invalid");

    expect(await repo.revoke("c_gangnam", issued.device.id, now)).toBe("not-found");
    expect(await repo.revoke("c_dunsan", issued.device.id, now)).toMatchObject({ revokedAt: now.toISOString() });
    expect(await repo.verify(issued.token, "c_dunsan", now)).toBe("invalid");
    // 폐기한 기기는 목록 뒤로 간다.
    expect((await repo.list("c_dunsan")).at(-1)?.id).toBe(issued.device.id);

    expect(
      await createKioskDeviceRepository(
        await createTestDb({ ...light, cafes: [{ id: "z", name: "z", region: "", openedAt: "2024-01-01", status: "closed" }] }, now),
      ).issue("z", "x", now),
    ).toBe("closed-cafe");
  });

  it("개발용 시드: 운영 중인 매장마다 kio_dev_<매장 id> 토큰이 있다", async () => {
    const repo = createKioskDeviceRepository(await createTestDb(light, now));
    expect(await repo.verify(devKioskToken("c_hongdae"), "c_hongdae", now)).toBe("ok");
    expect(await repo.verify(devKioskToken("c_hongdae"), "c_pangyo", now)).toBe("wrong-cafe");
  });
});

describe("checkKioskAccess", () => {
  const verify = async (token: string): Promise<KioskVerifyResult> =>
    token === "good" ? "ok" : token === "other" ? "wrong-cafe" : "invalid";

  it("토큰이 있으면 매장까지 확인한다", async () => {
    expect(await checkKioskAccess("Bearer good", verify, true)).toBeNull();
    expect(await checkKioskAccess("Bearer other", verify, true)).toMatchObject({ status: 403 });
    expect(await checkKioskAccess("Bearer bad", verify, false)).toMatchObject({ status: 401 });
  });

  it("토큰이 없으면 운영에서는 막고, 개발 중에는 허용한다", async () => {
    expect(await checkKioskAccess(null, verify, true)).toMatchObject({ status: 401 });
    expect(await checkKioskAccess(null, verify, false)).toBeNull();
    expect(await checkKioskAccess("Basic abc", verify, true)).toMatchObject({ status: 401 });
  });
});
