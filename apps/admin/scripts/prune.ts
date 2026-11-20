// 보관 기간이 지난 손님 예약·대기, 변경 이력, 로그인 실패·요청 제한 기록을 지운다(규칙: src/server/retention/repository.ts).
// Vercel에서는 Cron이 /api/cron/retention을 부르고, 다른 호스팅에서는 이 스크립트를 하루 한 번 예약 작업으로 돌린다.
//   DATABASE_URL=postgres://… pnpm --filter @avocado/admin db:prune
// DATABASE_URL이 없으면 개발 DB(.data/pglite)를 정리한다.
import { openPglite, openPostgres } from "@/db/index";
import { createRetentionRepository } from "@/server/retention/repository";

async function main() {
  const url = process.env.DATABASE_URL;
  const db = url ? await openPostgres(url) : await openPglite(process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  const removed = await createRetentionRepository(db).prune(new Date());
  console.log("보관 기간이 지난 기록을 지웠습니다:", removed);
  return 0;
}

// DB 연결이 열려 있어 프로세스가 끝나지 않으므로 직접 종료한다.
main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
