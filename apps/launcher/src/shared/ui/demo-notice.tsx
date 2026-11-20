import { demoBackofficeUrl, isDemoMode } from "@/shared/config";

/** 공개 데모에서만 보이는 안내 띠. 손님 화면을 가리지 않게 한 줄로 짧게 둔다. */
export function DemoNotice() {
  if (!isDemoMode()) return null;
  const backofficeUrl = demoBackofficeUrl();
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
      <p>
        <strong className="font-semibold">공개 데모</strong> · 매장과 손님은 가상 데이터이고, 30분마다 처음 상태로
        돌아갑니다.
        {backofficeUrl && (
          <>
            {" "}
            현장 대기를 등록한 뒤{" "}
            <a
              href={backofficeUrl}
              target="_blank"
              rel="noopener"
              className="inline-block py-0.5 font-medium underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005fcc]"
            >
              백오피스 데모 (새 탭)
            </a>
            의 예약·대기 화면에서 확인해 보세요.
          </>
        )}
      </p>
    </div>
  );
}
