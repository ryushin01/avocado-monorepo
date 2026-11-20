import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Link from "next/link";

import { Button } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

const LINKS = [
  { href: "/reservation", label: "온라인 예약" },
  { href: "/about", label: "브랜드 소개" },
  { href: "/about#stores", label: "매장 안내" },
];

const meta = { title: "부품/Sheet", component: Sheet } satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>메뉴 열기</SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>사이트 안내</SheetTitle>
          <SheetDescription>온라인 예약, 브랜드 소개, 매장 안내</SheetDescription>
        </SheetHeader>
        <nav aria-label="사이트 안내" className="px-4">
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-11 items-center underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  ),
};
