import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { CategorySection } from "@/widgets/category-section";
import { HeroCarousel } from "@/widgets/hero-carousel";
import { MainHeader, SiteMenu } from "@/widgets/site-header";
import { BRAND } from "@/shared/config/site";

export default function HomePage() {
  return (
    <>
      <MainHeader menu={<SiteMenu />} />
      <main id="main" tabIndex={-1} className="grid grid-cols-1 lg:grid-cols-6">
        <section
          id="hero"
          aria-labelledby="hero-title"
          className="relative h-[90svh] overflow-hidden rounded-lg border border-page lg:sticky lg:top-0 lg:col-span-2 lg:h-screen"
        >
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end gap-3 bg-gradient-to-b from-black/60 via-black/10 via-30% to-black/85 px-5 pb-20 text-white lg:px-[60px] lg:pb-28">
            <h1 id="hero-title" className="text-3xl font-bold tracking-tighter xl:text-4xl">
              {BRAND.tagline}
            </h1>
            <p className="text-sm tracking-tighter text-white/90 xl:text-base">{BRAND.description}</p>
          </div>
          <HeroCarousel />
        </section>

        <div className="min-w-0 lg:col-span-4 lg:pt-20">
          {CATEGORY_INFO.map((category) => (
            <CategorySection key={category.key} category={category} />
          ))}
        </div>
      </main>
    </>
  );
}
