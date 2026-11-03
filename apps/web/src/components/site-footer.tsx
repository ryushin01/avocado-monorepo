import { BRAND } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-10 md:px-6">
      <div className="rounded-lg bg-card p-8 text-sm text-card-foreground md:p-12">
        <p className="font-bold">{BRAND.name}</p>
        <p className="mt-2 text-muted-foreground">{BRAND.description}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          게임 정보와 순위는 BoardGameGeek 자료를 바탕으로 합니다.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          © {BRAND.shortName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
