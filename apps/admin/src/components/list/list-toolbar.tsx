"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, type FormEvent } from "react";

import { Button } from "@avocado/ui/components/button";
import { Input } from "@avocado/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";
import { GAME_CATEGORIES, GAME_CATEGORY_LABELS } from "@/lib/games/types";
import {
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABELS,
} from "@/lib/inventory/types";
import { buildListHref } from "@/lib/list";

const ALL = "all";

type Option = { value: string; label: string };

const CATEGORY_ITEMS: Option[] = [
  { value: ALL, label: "전체 카테고리" },
  ...GAME_CATEGORIES.map((c) => ({ value: c, label: GAME_CATEGORY_LABELS[c] })),
];

const STATUS_ITEMS: Option[] = [
  { value: ALL, label: "전체 상태" },
  ...INVENTORY_STATUSES.map((s) => ({
    value: s,
    label: INVENTORY_STATUS_LABELS[s],
  })),
];

function FilterSelect({
  name,
  label,
  items,
  defaultValue,
  onChange,
}: {
  name: string;
  label: string;
  items: Option[];
  defaultValue: string;
  onChange: () => void;
}) {
  return (
    <Select
      name={name}
      items={items}
      defaultValue={defaultValue}
      onValueChange={() => onChange()}
    >
      <SelectTrigger aria-label={label} className="w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * 목록 검색 폼. 제출하면 action 경로로 이동하며 조건이 URL에 남는다.
 * 빈 값과 '전체'는 URL에서 빼고, page는 보내지 않으므로 조건을 바꾸면 1페이지로 돌아간다.
 */
export function ListToolbar({
  action,
  values,
  showSearch = true,
  showCategory = true,
  showStatus = false,
  showDate = false,
  cafes,
  hidden,
}: {
  action: string;
  values: {
    q?: string;
    category?: string;
    status?: string;
    cafe?: string;
    date?: string;
  };
  showSearch?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  /** 날짜(YYYY-MM-DD) 하나로 거른다 */
  showDate?: boolean;
  /** 주면 매장 선택을 보여준다 (관리자) */
  cafes?: Option[];
  /** 화면에 보이지 않지만 함께 보낼 조건 (예: 다른 곳에서 고른 매장) */
  hidden?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // Select 값이 폼에 반영된 다음 제출되도록 한 틱 미룬다.
  const submit = () => setTimeout(() => formRef.current?.requestSubmit());

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params: Record<string, string | undefined> = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      const text = String(value).trim();
      params[key] = text && text !== ALL ? text : undefined;
    }
    router.replace(buildListHref(action, params));
  };

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={onSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      {Object.entries(hidden ?? {}).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      {cafes && cafes.length > 0 && (
        <FilterSelect
          name="cafe"
          label="매장"
          items={cafes}
          defaultValue={values.cafe ?? cafes[0].value}
          onChange={submit}
        />
      )}
      {showSearch && (
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            aria-label="게임 이름 검색"
            placeholder="게임 이름 검색"
            defaultValue={values.q ?? ""}
            className="pl-8"
          />
        </div>
      )}
      {showCategory && (
        <FilterSelect
          name="category"
          label="카테고리"
          items={CATEGORY_ITEMS}
          defaultValue={values.category ?? ALL}
          onChange={submit}
        />
      )}
      {showDate && (
        <Input
          name="date"
          type="date"
          aria-label="이용 날짜"
          defaultValue={values.date ?? ""}
          onChange={submit}
          className="w-full sm:w-40"
        />
      )}
      {showStatus && (
        <FilterSelect
          name="status"
          label="상태"
          items={STATUS_ITEMS}
          defaultValue={values.status ?? ALL}
          onChange={submit}
        />
      )}
      {(showSearch || showDate) && (
        <Button type="submit" variant="secondary">
          검색
        </Button>
      )}
    </form>
  );
}
