import Link from "next/link";

import { CATEGORY_INFO } from "@avocado/domain/catalog";
import { buttonVariants } from "@avocado/ui/components/button";

import { CategorySection } from "@/widgets/category-section";
import { HeroCarousel } from "@/widgets/hero-carousel";
import { BRAND } from "@/shared/config/site";

export default function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto flex max-w-7xl flex-col gap-10 px-4 md:px-6">
      <section className="relative overflow-hidden rounded-lg">
        <HeroCarousel />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 text-white md:p-12">
          <h1 className="text-4xl font-bold md:text-6xl">{BRAND.tagline}</h1>
          <p className="max-w-xl text-lg text-white/85">{BRAND.description}</p>
          <div className="pointer-events-auto">
            <Link href="#categories" className={buttonVariants({ size: "lg" })}>
              게임 유형 둘러보기
            </Link>
          </div>
        </div>
      </section>

      <div id="categories" className="flex scroll-mt-24 flex-col gap-10">
        {CATEGORY_INFO.map((category) => (
          <CategorySection key={category.key} category={category} />
        ))}
      </div>
    </main>
  );
}
