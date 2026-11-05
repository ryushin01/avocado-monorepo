/** 목록 화면 공통: 한 페이지(또는 무한 스크롤 한 묶음)에 보여주는 개수 */
export const LIST_PAGE_SIZE = 20;

export type ListRange = { offset: number; limit: number };

export type ListResult<T> = { items: T[]; total: number };

export function pageRange(page: number, size = LIST_PAGE_SIZE): ListRange {
  return { offset: (page - 1) * size, limit: size };
}

export function slice<T>(items: T[], range?: ListRange): ListResult<T> {
  return {
    items: range ? items.slice(range.offset, range.offset + range.limit) : items,
    total: items.length,
  };
}

/** URL의 page 파라미터. 1 이상의 정수가 아니면 1. */
export function parsePage(params: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export type PageWindowItem = number | "ellipsis";

/**
 * 페이지 번호 목록. 처음·끝 페이지와 현재 페이지 앞뒤 siblings개를 보여주고
 * 사이는 말줄임으로 채운다. 예) 10쪽 중 5쪽 → 1 … 4 5 6 … 10
 */
export function getPageWindow(
  page: number,
  pageCount: number,
  siblings = 1,
): PageWindowItem[] {
  // 처음·끝·현재·앞뒤·말줄임 2개를 다 보여줘도 모자라지 않으면 전부 나열한다.
  if (pageCount <= 5 + siblings * 2) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const start = Math.max(2, page - siblings);
  const end = Math.min(pageCount - 1, page + siblings);
  const items: PageWindowItem[] = [1];

  // 말줄임이 한 페이지만 가리게 되면 그냥 그 번호를 보여준다.
  if (start === 3) items.push(2);
  else if (start > 3) items.push("ellipsis");

  for (let p = start; p <= end; p++) items.push(p);

  if (end === pageCount - 2) items.push(pageCount - 1);
  else if (end < pageCount - 2) items.push("ellipsis");

  items.push(pageCount);
  return items;
}

/** 검색 조건을 유지한 채 해당 페이지로 가는 링크. 빈 값과 1페이지는 생략한다. */
export function buildListHref(
  path: string,
  params: Record<string, string | undefined>,
  page = 1,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
