import { createHash, randomBytes } from "node:crypto";

import { and, asc, eq, isNull } from "drizzle-orm";

import type { Database } from "@/db";
import { newId } from "@/db/ids";
import { cafes, kioskDevices } from "@/db/schema";

/** 매장 키오스크(런처) 기기. 토큰 원문은 발급할 때 한 번만 알 수 있다. */
export type KioskDevice = {
  id: string;
  cafeId: string;
  name: string;
  /** 화면에서 기기를 구분하는 토큰 앞부분 */
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
};

/** 토큰 → 저장용 해시. 토큰이 충분히 길고 무작위라 SHA-256으로 충분하다. */
export const hashKioskToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** 새 토큰: kio_ + 무작위 32글자 */
export const generateKioskToken = () => `kio_${randomBytes(24).toString("base64url")}`;

const prefixOf = (token: string) => `${token.slice(0, 8)}…`;

/**
 * - ok: 이 매장의 사용 중인 기기
 * - wrong-cafe: 다른 매장 기기의 토큰 (주소의 매장과 다름)
 * - invalid: 없거나 폐기한 토큰
 */
export type KioskVerifyResult = "ok" | "wrong-cafe" | "invalid";

export interface KioskDeviceRepository {
  /** 매장의 기기, 사용 중인 것 먼저·등록순 */
  list(cafeId: string): Promise<KioskDevice[]>;
  /** 새 기기 토큰 발급. 폐점 매장에는 발급하지 않는다. */
  issue(cafeId: string, name: string, now: Date): Promise<{ device: KioskDevice; token: string } | "closed-cafe">;
  revoke(cafeId: string, id: string, now: Date): Promise<KioskDevice | "not-found">;
  /** 키오스크 API 요청의 토큰 확인. 통과하면 마지막 사용 시각을 남긴다. */
  verify(token: string, cafeId: string, now: Date): Promise<KioskVerifyResult>;
}

const toDevice = (r: typeof kioskDevices.$inferSelect): KioskDevice => ({
  id: r.id,
  cafeId: r.cafeId,
  name: r.name,
  tokenPrefix: r.tokenPrefix,
  createdAt: r.createdAt.toISOString(),
  lastUsedAt: r.lastUsedAt?.toISOString(),
  revokedAt: r.revokedAt?.toISOString(),
});

/** 마지막 사용 시각은 1분에 한 번만 고친다 (요청마다 쓰기를 줄인다). */
const TOUCH_INTERVAL = 60_000;

export function createKioskDeviceRepository(db: Database): KioskDeviceRepository {
  return {
    async list(cafeId) {
      const rows = await db
        .select()
        .from(kioskDevices)
        .where(eq(kioskDevices.cafeId, cafeId))
        .orderBy(asc(kioskDevices.createdAt));
      return rows.map(toDevice).sort((a, b) => Number(Boolean(a.revokedAt)) - Number(Boolean(b.revokedAt)));
    },

    async issue(cafeId, name, now) {
      const [cafe] = await db.select().from(cafes).where(and(eq(cafes.id, cafeId), eq(cafes.status, "open")));
      if (!cafe) return "closed-cafe";
      const token = generateKioskToken();
      const [row] = await db
        .insert(kioskDevices)
        .values({
          id: newId("kd"),
          cafeId,
          name,
          tokenHash: hashKioskToken(token),
          tokenPrefix: prefixOf(token),
          createdAt: now,
        })
        .returning();
      return { device: toDevice(row), token };
    },

    async revoke(cafeId, id, now) {
      const [row] = await db
        .update(kioskDevices)
        .set({ revokedAt: now })
        .where(and(eq(kioskDevices.id, id), eq(kioskDevices.cafeId, cafeId), isNull(kioskDevices.revokedAt)))
        .returning();
      return row ? toDevice(row) : "not-found";
    },

    async verify(token, cafeId, now) {
      const [row] = await db
        .select()
        .from(kioskDevices)
        .where(and(eq(kioskDevices.tokenHash, hashKioskToken(token)), isNull(kioskDevices.revokedAt)));
      if (!row) return "invalid";
      if (row.cafeId !== cafeId) return "wrong-cafe";
      if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > TOUCH_INTERVAL) {
        await db.update(kioskDevices).set({ lastUsedAt: now }).where(eq(kioskDevices.id, row.id));
      }
      return "ok";
    },
  };
}

/** 개발용 시드: 매장마다 토큰이 정해진 기기 하나 (kio_dev_<매장 id>). 운영 DB에는 넣지 않는다. */
export const devKioskToken = (cafeId: string) => `kio_dev_${cafeId}`;
export function seedKioskDevice(cafeId: string, createdAt: Date) {
  const token = devKioskToken(cafeId);
  return {
    id: `kd_${cafeId}`,
    cafeId,
    name: "개발용 키오스크",
    tokenHash: hashKioskToken(token),
    tokenPrefix: prefixOf(token),
    createdAt,
  };
}
