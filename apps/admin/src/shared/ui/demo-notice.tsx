import { DEMO_RESET_MINUTES, demoKioskUrl, isDemoMode } from "@/shared/config";

/**
 * 공개 데모에서만 보이는 안내 띠. 데이터가 가상이고 곧 처음 상태로 돌아간다는 것을 알린다.
 * offline: 공유 데모 DB에 닿지 않아 이 서버의 임시 데이터(개발용 시드)로 대신 보여 주는 중(role="status"로 알림)
 */
export function DemoNotice({ offline = false }: { offline?: boolean }) {
  if (!isDemoMode()) return null;
  const kioskUrl = demoKioskUrl();
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 md:px-6 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50">
      <p>
        <strong className="font-semibold">공개 데모</strong> · 가상 데이터이며, 바꾼 내용은 {DEMO_RESET_MINUTES}분마다 처음
        상태로 돌아갑니다.
        {kioskUrl && (
          <>
            {" "}
            <a
              href={kioskUrl}
              target="_blank"
              rel="noopener"
              className="font-medium underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005fcc] dark:focus-visible:outline-amber-200"
            >
              강남점 키오스크 데모 (새 탭)
            </a>
            에서 대기를 등록하면 예약·대기 화면에 새로고침 없이 나타납니다.
          </>
        )}
      </p>
      {offline && (
        <p role="status" className="mt-1 font-medium">
          오프라인 데이터로 표시 중 · 공유 데모 DB에 연결할 수 없어 이 서버의 임시 데이터로 보여 드립니다. 바꾼 내용은 화면마다
          다르게 보이거나 곧 사라질 수 있습니다.
        </p>
      )}
    </div>
  );
}
