"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@avocado/ui/components/button";
import { cn } from "@avocado/ui/lib/utils";

import { kioskOutlineButton } from "./kiosk-header";

/**
 * 인원 고르기: 큰 −/+ 버튼. 값은 숨은 input(name)으로 폼에 실린다.
 * labelledBy: 화면에 보이는 라벨의 id (보이는 글자와 접근 이름을 맞춘다). 없으면 "인원"
 */
export function PartySizeStepper({
  name,
  defaultValue = 2,
  labelledBy,
}: {
  name: string;
  defaultValue?: number;
  labelledBy?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const set = (n: number) => setValue(Math.min(20, Math.max(1, n)));
  return (
    <div
      className="flex items-center gap-4"
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : "인원"}
    >
      <input type="hidden" name={name} value={value} />
      <Button type="button" variant="outline" className={cn(kioskOutlineButton, "size-14")} onClick={() => set(value - 1)} aria-label="인원 줄이기">
        <Minus className="size-6" strokeWidth={1.5} />
      </Button>
      <span className="w-24 text-center text-4xl tabular-nums" aria-live="polite">
        {value}명
      </span>
      <Button type="button" variant="outline" className={cn(kioskOutlineButton, "size-14")} onClick={() => set(value + 1)} aria-label="인원 늘리기">
        <Plus className="size-6" strokeWidth={1.5} />
      </Button>
    </div>
  );
}
