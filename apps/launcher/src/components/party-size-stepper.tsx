"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@avocado/ui/components/button";

/** 인원 고르기: 큰 −/+ 버튼. 값은 숨은 input(name)으로 폼에 실린다. */
export function PartySizeStepper({ name, defaultValue = 2 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const set = (n: number) => setValue(Math.min(20, Math.max(1, n)));
  return (
    <div className="flex items-center gap-4" role="group" aria-label="인원">
      <input type="hidden" name={name} value={value} />
      <Button type="button" variant="outline" className="size-14" onClick={() => set(value - 1)} aria-label="인원 줄이기">
        <Minus className="size-6" />
      </Button>
      <span className="w-20 text-center text-3xl font-bold tabular-nums" aria-live="polite">
        {value}명
      </span>
      <Button type="button" variant="outline" className="size-14" onClick={() => set(value + 1)} aria-label="인원 늘리기">
        <Plus className="size-6" />
      </Button>
    </div>
  );
}
