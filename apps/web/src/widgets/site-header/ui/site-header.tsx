import Image from "next/image";
import Link from "next/link";

import { CATEGORY_INFO } from "@avocado/domain/catalog";

import { BRAND } from "@/shared/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-page/90 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Image src="/images/logo.png" alt="" width={32} height={32} />
          {BRAND.name}
        </Link>
        <nav aria-label="게임 유형" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <ul className="flex gap-1 whitespace-nowrap text-sm">
            {CATEGORY_INFO.map((c) => (
              <li key={c.key}>
                <Link
                  href={`/games/${c.key}`}
                  className="block rounded-md px-2.5 py-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
