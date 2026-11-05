"use client";

import { defaultRangeExtractor, useWindowVirtualizer } from "@tanstack/react-virtual";
import { RotateCw } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@avocado/ui/components/button";
import { ItemGroup } from "@avocado/ui/components/item";
import { Spinner } from "@avocado/ui/components/spinner";
import { LIST_PAGE_SIZE, type ListResult } from "@/shared/lib/list";

/** 실제 높이는 그린 뒤에 다시 잰다. */
const ESTIMATED_ITEM_HEIGHT = 112;
const ITEM_GAP = 8;

type ListState<T> = {
  /** 서버가 렌더링한 첫 묶음. 바뀌면(수정·등록 후 갱신) 이후 묶음도 다시 불러온다. */
  firstPage: T[];
  /** 스크롤하며 추가로 불러온 항목 */
  more: T[];
  total: number;
  stale: boolean;
};

/**
 * 모바일 무한 스크롤 목록. 끝에 닿으면 다음 묶음을 불러온다.
 * 이용 기록처럼 끝없이 늘어나는 목록도 가볍도록, 화면 근처의 항목만 그린다(가상화).
 * 조건이 바뀌면 부모가 key를 바꿔 처음부터 다시 시작한다.
 *
 * fetchMore는 조건이 같으면 같은 함수여야 한다(useCallback).
 */
export function InfiniteList<T>({
  firstPage,
  total,
  fetchMore,
  getKey,
  renderItem,
  label,
}: {
  firstPage: T[];
  total: number;
  fetchMore: (offset: number, limit: number) => Promise<ListResult<T>>;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  label: string;
}) {
  // TanStack Virtual은 내부 값을 직접 바꾸므로 React Compiler의 자동 메모이제이션에서 뺀다.
  "use no memo";

  const [state, setState] = useState<ListState<T>>({
    firstPage,
    more: [],
    total,
    stale: false,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 서버 데이터가 갱신되면 첫 묶음을 교체하고, 이미 불러온 범위는 다시 가져오도록 표시한다.
  if (state.firstPage !== firstPage) {
    setState((s) => ({
      firstPage,
      more: s.more,
      total,
      stale: s.more.length > 0,
    }));
  }

  useEffect(() => {
    if (!state.stale) return;
    let cancelled = false;
    fetchMore(state.firstPage.length, state.more.length)
      .then((result) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          more: result.items,
          total: result.total,
          stale: false,
        }));
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, stale: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMore, state.stale, state.firstPage.length, state.more.length]);

  const seen = new Set<string>();
  const items = [...state.firstPage, ...state.more].filter((item) => {
    const key = getKey(item);
    return !seen.has(key) && seen.add(key);
  });
  const loadedCount = state.firstPage.length + state.more.length;
  const hasMore = loadedCount < state.total;

  const listRef = useRef<HTMLDivElement>(null);
  const focusedIndex = useRef<number | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    const top = listRef.current?.getBoundingClientRect().top ?? 0;
    setScrollMargin(top + window.scrollY);
    // 위쪽 영역의 높이는 데이터와 함께 바뀔 수 있어 불러올 때마다 다시 잰다.
  }, [items.length]);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    gap: ITEM_GAP,
    overscan: 6,
    scrollMargin,
    // 서버는 창 크기를 모르므로 모바일 크기로 가정해, 첫 항목들을 처음 HTML에 넣는다.
    initialRect: { width: 390, height: 844 },
    getItemKey: (index) => getKey(items[index]),
    // 초점이 있는 항목은 화면 밖으로 나가도 지우지 않는다. 지우면 키보드 초점이 페이지 처음으로 튕긴다.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      const focused = focusedIndex.current;
      return focused === null || focused >= range.count || indexes.includes(focused)
        ? indexes
        : [...indexes, focused].sort((a, b) => a - b);
    },
  });

  async function loadMore() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus("loading");
    try {
      const result = await fetchMore(loadedCount, LIST_PAGE_SIZE);
      setState((s) => ({
        ...s,
        more: [...s.more, ...result.items],
        total: result.total,
      }));
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }

  // 감시 요소가 화면 근처에 오면 다음 묶음을 불러온다. 불러온 개수가 바뀔 때마다
  // 다시 관찰하므로, 한 묶음으로 화면이 다 차지 않으면 바로 이어서 불러온다.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || status !== "idle") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMoreRef.current();
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, status, loadedCount]);

  return (
    <div className="flex flex-col gap-3">
      <div ref={listRef}>
        <ItemGroup
          className="relative block"
          style={{ height: virtualizer.getTotalSize() }}
          aria-label={label}
        >
          {virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              role="listitem"
              // 화면에 일부만 있어도 스크린 리더가 전체 개수와 위치를 알 수 있게 한다.
              aria-setsize={hasMore ? state.total : items.length}
              aria-posinset={row.index + 1}
              data-index={row.index}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
              onFocusCapture={() => {
                focusedIndex.current = row.index;
              }}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) focusedIndex.current = null;
              }}
            >
              {renderItem(items[row.index])}
            </div>
          ))}
        </ItemGroup>
      </div>

      <div
        ref={sentinelRef}
        data-testid="load-more-sentinel"
        className="flex min-h-12 items-center justify-center text-sm text-muted-foreground"
      >
        {status === "loading" && (
          <span className="flex items-center gap-2">
            <Spinner />
            불러오는 중…
          </span>
        )}
        {status === "error" && (
          <Button variant="outline" size="sm" onClick={() => void loadMore()}>
            <RotateCw />
            다시 시도
          </Button>
        )}
        {status === "idle" && !hasMore && items.length > LIST_PAGE_SIZE && (
          <span>모두 불러왔습니다</span>
        )}
      </div>
    </div>
  );
}
