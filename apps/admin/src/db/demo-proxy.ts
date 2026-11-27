import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import type { PGlite, Transaction } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pg-proxy";
import superagent from "superagent";
import { z } from "zod";

import type { Database } from "./index";
import * as schema from "./schema";

/**
 * 공개 데모용 DB 중계.
 * Vercel은 화면(서버 액션 포함)과 API 라우트(로그인, 키오스크 API)를 서로 다른 함수로 나눠 띄운다.
 * 함수마다 메모리 DB를 따로 열면 키오스크가 등록한 대기가 백오피스 화면에 보이지 않으므로,
 * 메모리 DB는 이 경로(/api/demo/db)를 맡은 함수 하나에만 두고 나머지는 HTTP로 SQL을 보내 함께 쓴다.
 * 데모가 아니면(NEXT_PUBLIC_DEMO_MODE가 없으면) 경로가 404를 돌려주고 아무것도 하지 않는다.
 */
export const DEMO_DB_PATH = "/api/demo/db";

type Method = "all" | "execute";
type ProxyQuery = { sql: string; params: unknown[]; method: Method; session?: string };
type ProxyError = { message: string; code?: string; detail?: string; constraint?: string; table?: string; column?: string };

/** 서버끼리만 아는 열쇠. 로그인 비밀값에서 만들어 따로 환경 변수를 두지 않는다. */
function proxyKey(): string | undefined {
  const secret = process.env.NEXTAUTH_SECRET;
  return secret ? createHash("sha256").update(`avocado-demo-db:${secret}`).digest("hex") : undefined;
}

// BigInt는 JSON으로 바꿀 수 없어 글자로 보낸다(PostgreSQL 드라이버가 int8을 글자로 주는 것과 같다).
const toJson = (value: unknown) => JSON.stringify(value, (_key, v: unknown) => (typeof v === "bigint" ? v.toString() : v));

/* ---------------- 보내는 쪽: 화면·API 라우트가 쓰는 Drizzle ---------------- */

/** baseUrl(배포 주소)의 /api/demo/db로 SQL을 보내는 Drizzle. 쿼리 코드는 PGlite·PostgreSQL과 똑같이 쓴다. */
export function openDemoProxyDb(baseUrl: string): Database {
  const url = new URL(DEMO_DB_PATH, baseUrl).toString();
  const connect = (inLine: Line, session?: string) =>
    drizzle(async (sql, params, method) => ({ rows: await inLine(() => send(url, { sql, params, method, session })) }), {
      schema,
    });
  const db = connect(sharedLine);
  // pg-proxy 드라이버는 트랜잭션을 지원하지 않아 직접 만든다. begin부터 commit·rollback까지 같은 세션 번호를 붙여,
  // 받는 쪽이 그사이 다른 쿼리를 끼우지 않게 한다(중첩 트랜잭션·tx.rollback()은 쓰지 않는다).
  // 트랜잭션 안의 쿼리는 공용 줄이 아닌 트랜잭션마다의 줄에 세운다. 공용 줄에 세우면 이 트랜잭션을 기다리는 쿼리 뒤에 막힌다.
  // 같은 트랜잭션에서 Promise.all로 동시에 보낸 쿼리도 이 줄에서 하나씩, 부른 순서대로 가고, commit·rollback은 그 뒤에 간다.
  db.transaction = (async (run) => {
    const session = randomUUID();
    const txLine = createLine();
    const control = (sql: string) => txLine(() => send(url, { sql, params: [], method: "execute", session }));
    await control("begin");
    try {
      const result = await run(connect(txLine, session) as never);
      await control("commit");
      return result;
    } catch (error) {
      await control("rollback").catch(() => {});
      throw error;
    }
  }) as typeof db.transaction;
  return db as unknown as Database;
}

/** 넣은 순서대로 하나씩 실행하는 줄. 앞의 작업이 실패해도 다음 작업은 실행한다. */
type Line = <T>(task: () => Promise<T>) => Promise<T>;
function createLine(): Line {
  let tail: Promise<unknown> = Promise.resolve();
  return (task) => {
    const result = tail.then(task, task);
    tail = result.catch(() => {});
    return result;
  };
}

/**
 * 이 인스턴스가 트랜잭션 밖에서 보내는 쿼리를 한 번에 하나씩 보낸다. 화면 하나가 쿼리 수십 개를 한꺼번에 보내면
 * Vercel이 받는 쪽 함수를 여러 대로 늘리고, 대마다 메모리 DB가 따로 생겨 데이터가 갈라진다.
 */
const sharedLine = createLine();

/** 받는 쪽의 응답. 쿼리 결과(rows)나 PostgreSQL 오류의 code·constraint 등(error) */
const ProxyResponseSchema = z.object({
  rows: z.array(z.unknown()).optional(),
  error: z
    .object({
      message: z.string().optional(),
      code: z.string().optional(),
      detail: z.string().optional(),
      constraint: z.string().optional(),
      table: z.string().optional(),
      column: z.string().optional(),
    })
    .optional(),
});

/** 버퍼로 받은 본문을 JSON으로 읽는다. 비었거나 JSON이 아니면 undefined */
function readJson(body: unknown): unknown {
  if (!Buffer.isBuffer(body)) return undefined;
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    return undefined;
  }
}

async function send(url: string, query: ProxyQuery): Promise<unknown[]> {
  const key = proxyKey();
  if (!key) throw new Error("NEXTAUTH_SECRET이 없어 데모 DB에 연결할 수 없습니다.");
  // SuperAgent(Node http)는 Next.js의 fetch 캐시를 거치지 않으므로 cache: "no-store"와 같게 매번 새로 보낸다.
  // .ok(() => true): 오류 응답(400 등)도 예외 대신 받아, 본문의 PostgreSQL 오류를 아래에서 그대로 던진다.
  const response = await superagent
    .post(url)
    .set("content-type", "application/json")
    .set("x-demo-db-key", key)
    .ok(() => true)
    .responseType("arraybuffer")
    .send(toJson(query));
  const parsed = ProxyResponseSchema.safeParse(readJson(response.body));
  const body = parsed.success ? parsed.data : {};
  if (response.ok && body.rows) return body.rows;
  // PostgreSQL 오류의 code·constraint 등을 그대로 붙여, 직접 연결했을 때와 같은 모양으로 던진다.
  const { message = `데모 DB 요청이 실패했습니다 (${response.status}).`, ...details } = body.error ?? {};
  throw Object.assign(new Error(message), details);
}

/* ---------------- 받는 쪽: 메모리 DB를 가진 /api/demo/db ---------------- */

// drizzle-orm/pglite와 같게, 날짜·시간 값은 글자 그대로 두고 Drizzle 열 정의가 해석하게 한다.
const raw = (value: string) => value;
const PARSERS = {
  1082: raw, // date
  1114: raw, // timestamp
  1184: raw, // timestamptz
  1186: raw, // interval
  1182: raw, // date[]
  1115: raw, // timestamp[]
  1185: raw, // timestamptz[]
  1187: raw, // interval[]
  1231: raw, // numeric[]
};

/** 보내는 쪽이 begin 뒤 이만큼 아무것도 보내지 않으면 되돌리고 잠금을 푼다(요청이 중간에 끊긴 경우). */
const SESSION_IDLE_MS = 10_000;

type Session = { tx: Transaction; finish: (rollback: boolean) => void; done: Promise<void>; timer?: ReturnType<typeof setTimeout> };
const globalForProxy = globalThis as { demoDbSessions?: Map<string, Session> };
const sessions = (globalForProxy.demoDbSessions ??= new Map());

export async function handleDemoDbRequest(request: Request, client: () => Promise<PGlite>): Promise<Response> {
  const key = proxyKey();
  const given = Buffer.from(request.headers.get("x-demo-db-key") ?? "");
  if (!key || given.length !== key.length || !timingSafeEqual(given, Buffer.from(key))) {
    return new Response(null, { status: 404 });
  }
  try {
    const rows = await run(await client(), (await request.json()) as ProxyQuery);
    return new Response(toJson({ rows }), { headers: { "content-type": "application/json" } });
  } catch (error) {
    const { message, code, detail, constraint, table, column } = error as ProxyError;
    return Response.json({ error: { message, code, detail, constraint, table, column } }, { status: 400 });
  }
}

async function run(pg: PGlite, { sql, params, method, session }: ProxyQuery): Promise<unknown[]> {
  const options = { rowMode: method === "all" ? ("array" as const) : ("object" as const), parsers: PARSERS };
  if (!session) return (await pg.query(sql, params, options)).rows;

  const command = sql.trim().toLowerCase();
  if (command.startsWith("begin")) {
    await openSession(pg, session);
    return [];
  }
  const open = sessions.get(session);
  // 이미 끝난 세션(시간 초과로 되돌림)의 rollback은 할 일이 없다.
  if (!open && command === "rollback") return [];
  if (!open) throw new Error("작업 시간이 초과돼 취소됐습니다. 다시 시도해주세요.");
  if (command === "commit" || command === "rollback") {
    open.finish(command === "rollback");
    await open.done;
    return [];
  }
  keepAlive(session, open);
  return (await open.tx.query(sql, params, options)).rows;
}

/** PGlite 트랜잭션을 열어 두고 commit·rollback이 올 때까지 기다린다. 그동안 세션 밖의 쿼리는 PGlite가 줄 세운다. */
function openSession(pg: PGlite, id: string): Promise<void> {
  return new Promise((ready, fail) => {
    let finish: (rollback: boolean) => void = () => {};
    const finished = new Promise<boolean>((resolve) => (finish = resolve));
    const done: Promise<void> = pg
      .transaction(async (tx) => {
        const session: Session = { tx, finish, done };
        sessions.set(id, session);
        keepAlive(id, session);
        ready();
        if (await finished) await tx.rollback();
      })
      .finally(() => {
        clearTimeout(sessions.get(id)?.timer);
        sessions.delete(id);
      });
    // 열지 못했으면 begin 요청이 실패하고, 연 뒤의 실패(commit 오류)는 commit 요청이 받는다.
    done.catch(fail);
  });
}

function keepAlive(id: string, session: Session) {
  clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    if (sessions.get(id) === session) session.finish(true);
  }, SESSION_IDLE_MS);
}
