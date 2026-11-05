import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CATEGORY_INFO, catalogGamesIn } from "@avocado/domain/catalog";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { SortedGames } from "./sorted-games";

const findCategory = (key: string) => CATEGORY_INFO.find((c) => c.key === key);

export function generateStaticParams() {
  return CATEGORY_INFO.map((c) => ({ category: c.key }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[category]">): Promise<Metadata> {
  const category = findCategory((await params).category);
  return category ? { title: category.label, description: category.description } : {};
}

export default function CategoryPage({ params }: PageProps<"/games/[category]">) {
  // Partial Prefetching에서는 params도 Suspense 안에서 읽어야 바로 이동하는 틀이 만들어진다.
  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6">
      <div className="flex flex-col gap-8 rounded-lg bg-card px-5 py-10 text-card-foreground md:px-12 md:py-16">
        <Suspense fallback={<GridSkeleton />}>
          <CategoryContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/games/[category]">, "params">) {
  const category = findCategory((await params).category);
  if (!category) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-widest text-primary">
          {category.bggType.toUpperCase()}
        </p>
        <h1 className="text-3xl font-bold">{category.label}</h1>
        <p className="text-muted-foreground">{category.description}</p>
      </header>
      {/* 정렬은 주소(sort)로 정한다. 정적 빌드에서도 동작하도록 브라우저에서 읽는다. */}
      <Suspense fallback={<GridSkeleton />}>
        <SortedGames categoryKey={category.key} games={catalogGamesIn(category.key)} />
      </Suspense>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
      ))}
    </div>
  );
}
