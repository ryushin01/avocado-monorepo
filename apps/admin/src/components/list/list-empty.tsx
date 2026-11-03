import { SearchX } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avocado/ui/components/empty";
import { Skeleton } from "@avocado/ui/components/skeleton";

export function ListEmpty({
  title = "검색 결과가 없습니다",
  description = "검색어나 필터를 바꿔서 다시 시도해보세요.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ListSkeleton() {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    </div>
  );
}
