import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@avocado/ui/components/pagination";
import { buildListHref, getPageWindow } from "@/lib/list";

export function ListPagination({
  page,
  pageCount,
  path,
  params,
}: {
  page: number;
  pageCount: number;
  path: string;
  /** 페이지를 넘겨도 유지할 검색 조건 */
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => buildListHref(path, params, p);

  return (
    <Pagination aria-label="페이지 이동">
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious
              href={href(page - 1)}
              text="이전"
              aria-label="이전 페이지"
            />
          </PaginationItem>
        )}
        {getPageWindow(page, pageCount).map((item, i) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href={href(item)}
                isActive={item === page}
                aria-label={`${item}페이지`}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        {page < pageCount && (
          <PaginationItem>
            <PaginationNext
              href={href(page + 1)}
              text="다음"
              aria-label="다음 페이지"
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
