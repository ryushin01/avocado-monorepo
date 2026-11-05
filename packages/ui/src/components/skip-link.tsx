/**
 * 반복되는 메뉴를 건너뛰고 본문으로 가는 링크(KWCAG 6.4.1). 평소에는 숨어 있다가 키보드 초점을 받으면 나타납니다.
 * 페이지의 `<main>`에 `id="main"`과 `tabIndex={-1}`이 있어야 합니다.
 */
function SkipLink() {
  return (
    <a
      href="#main"
      data-slot="skip-link"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-3 focus:ring-ring"
    >
      본문 바로가기
    </a>
  )
}

export { SkipLink }
