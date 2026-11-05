import { inspect } from "node:util";

import { logError, redactConsoleErrors } from "@avocado/logger";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/db/testing";
import { reservations } from "@/db/schema";

const PHONE = "01012345678";
const NAME = "가림테스트";
const MEMO = `첫 줄\n둘째 줄 ${PHONE}`;

/** 없는 매장으로 예약을 넣어 실제 Drizzle 오류를 만든다. 쿼리 값에 전화번호·이름·메모가 들어 있다. */
async function realQueryError() {
  const db = await createTestDb();
  const error = await db
    .insert(reservations)
    .values({
      id: "r_redaction",
      cafeId: "없는매장",
      name: NAME,
      phone: PHONE,
      partySize: 2,
      startsAt: new Date(),
      memo: MEMO,
      status: "confirmed",
      createdAt: new Date(),
    })
    .then(
      () => {
        throw new Error("외래 키 오류가 나야 합니다.");
      },
      (e: unknown) => e as Error,
    );
  // 형식이 바뀌면 가림 규칙이 조용히 무력해지므로 전제부터 확인한다.
  expect(error.message).toContain(`params: `);
  expect(error.message).toContain(PHONE);
  return error;
}

function expectNoPersonalData(text: string) {
  expect(text).not.toContain(PHONE);
  expect(text).not.toContain(NAME);
  expect(text).not.toContain("둘째 줄");
}

describe("실제 DB 오류의 개인정보 가림", () => {
  const original = console.error;
  afterEach(() => {
    console.error = original;
    vi.restoreAllMocks();
  });

  it("logError의 JSON에 쿼리 값이 남지 않는다", async () => {
    const error = await realQueryError();
    const output = vi.fn();
    console.error = output;

    logError("admin", "test", { error });

    const line = output.mock.calls[0][0] as string;
    expectNoPersonalData(line);
    expect(JSON.parse(line).message).toContain("params: [생략]");
  });

  it("Next.js가 console.error로 출력하는 오류에도 쿼리 값이 남지 않는다", async () => {
    const error = await realQueryError();
    const output = vi.fn();
    console.error = output;
    redactConsoleErrors();

    console.error("⨯", error);

    expectNoPersonalData(inspect(output.mock.calls[0], { depth: 10 }));
  });
});
