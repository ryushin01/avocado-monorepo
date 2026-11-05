"use client";

import { flexRender, rowSortingFeature, tableFeatures, useTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { CatalogRowActions } from "@/features/manage-game";
import {
  formatPlayTime,
  formatPlayers,
  GameCategoryBadges,
  GameNameCell,
} from "@/entities/game/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import {
  GAME_DIFFICULTY_LABELS,
  nextGameSort,
  type CatalogEntry,
  type GameListFilter,
  type GameSortKey,
} from "@/entities/game";
import { buildListHref } from "@/shared/lib/list";

const features = tableFeatures({ rowSortingFeature });
type Column = ColumnDef<typeof features, CatalogEntry>;

export function formatHolding({ holding }: CatalogEntry) {
  return holding.cafeCount === 0
    ? "보유 매장 없음"
    : `${holding.cafeCount}개 매장 · ${holding.quantity}개`;
}

const COLUMNS: Column[] = [
  {
    id: "name",
    header: "이름",
    // 정렬은 서버가 하지만, 값을 읽는 함수가 있어야 정렬할 수 있는 열이 된다.
    accessorFn: (game) => game.name,
    cell: ({ row }) => <GameNameCell game={row.original} />,
  },
  {
    id: "categories",
    header: "카테고리",
    enableSorting: false,
    cell: ({ row }) => <GameCategoryBadges game={row.original} />,
  },
  {
    id: "players",
    header: "인원",
    accessorFn: (game) => game.minPlayers,
    cell: ({ row }) => formatPlayers(row.original),
  },
  {
    id: "playTime",
    header: "플레이 시간",
    accessorFn: (game) => game.playTimeMin,
    cell: ({ row }) => formatPlayTime(row.original),
  },
  {
    id: "difficulty",
    header: "난이도",
    accessorFn: (game) => game.difficulty,
    cell: ({ row }) => GAME_DIFFICULTY_LABELS[row.original.difficulty],
  },
  {
    id: "holding",
    header: "보유 현황",
    accessorFn: (game) => game.holding.quantity,
    cell: ({ row }) => formatHolding(row.original),
  },
];

const ACTIONS: Column = {
  id: "actions",
  enableSorting: false,
  header: () => <span className="sr-only">작업</span>,
  cell: ({ row }) => <CatalogRowActions game={row.original} />,
};

const CELL_CLASS: Record<string, string | undefined> = {
  players: "whitespace-nowrap",
  playTime: "whitespace-nowrap",
  holding: "whitespace-nowrap text-muted-foreground",
};

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/**
 * 카탈로그 표. 정렬은 서버가 하고(전체 목록 기준이어야 하므로) 상태는 URL에 둔다.
 * 머리글은 링크라서 새 탭으로 열 수 있고, 정렬된 주소를 그대로 공유할 수 있다.
 */
export function CatalogTable({
  games,
  canEdit,
  filter,
}: {
  games: CatalogEntry[];
  canEdit: boolean;
  filter: GameListFilter;
}) {
  // TanStack Table은 내부 값을 직접 바꾸므로 React Compiler의 자동 메모이제이션에서 뺀다.
  "use no memo";

  const columns = useMemo(() => (canEdit ? [...COLUMNS, ACTIONS] : COLUMNS), [canEdit]);
  const sortKey = filter.sort ?? "name";
  const sorting = useMemo(
    () => [{ id: sortKey, desc: filter.order === "desc" }],
    [sortKey, filter.order],
  );

  const table = useTable({
    features,
    columns,
    data: games,
    getRowId: (game) => game.id,
    manualSorting: true,
    state: { sorting },
  });

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const content = flexRender(header.column.columnDef.header, header.getContext());
                const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sorted ? ARIA_SORT[sorted] : undefined}
                    className={header.column.id === "actions" ? "w-12" : undefined}
                  >
                    {header.column.getCanSort() ? (
                      <Link
                        href={buildListHref("/games", {
                          q: filter.q,
                          category: filter.category,
                          ...nextGameSort(header.column.id as GameSortKey, filter),
                        })}
                        className="inline-flex min-h-8 items-center gap-1 rounded-sm hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {content}
                        <Icon aria-hidden="true" className={sorted ? "size-4" : "size-4 opacity-40"} />
                      </Link>
                    ) : (
                      content
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className={CELL_CLASS[cell.column.id]}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
