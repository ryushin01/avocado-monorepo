"use client";

import { Delete } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@avocado/ui/components/button";
import { cn } from "@avocado/ui/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * 전화번호 뒷자리 4자리 입력용 큰 숫자 패드. 4자리를 채우면 바로 제출한다.
 * 실물 키보드의 숫자·Backspace도 받는다.
 */
export function Keypad({
  label,
  disabled,
  onComplete,
}: {
  label: string;
  disabled?: boolean;
  onComplete: (digits: string) => void;
}) {
  const [digits, setDigits] = useState("");

  const press = (key: string) => {
    if (disabled) return;
    if (key === "back") return setDigits(digits.slice(0, -1));
    if (key === "clear") return setDigits("");
    if (digits.length === 4) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === 4) {
      // 화면에 4자리를 먼저 보여준 뒤 제출한다. (부작용은 상태 갱신 함수 밖에서 한 번만)
      setTimeout(() => {
        onComplete(next);
        setDigits("");
      }, 150);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <p className="text-center text-lg font-medium" id="keypad-label">
        {label}
      </p>
      <div className="flex justify-center gap-3" aria-live="polite" aria-labelledby="keypad-label">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex size-14 items-center justify-center rounded-xl border-2 text-3xl font-bold tabular-nums",
              i < digits.length ? "border-primary" : "border-border text-muted-foreground",
            )}
          >
            {digits[i] ?? ""}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <Button key={k} variant="outline" className="h-16 text-2xl" disabled={disabled} onClick={() => press(k)}>
            {k}
          </Button>
        ))}
        <Button variant="ghost" className="h-16 text-base" disabled={disabled} onClick={() => press("clear")}>
          지우기
        </Button>
        <Button variant="outline" className="h-16 text-2xl" disabled={disabled} onClick={() => press("0")}>
          0
        </Button>
        <Button
          variant="ghost"
          className="h-16"
          disabled={disabled}
          onClick={() => press("back")}
          aria-label="한 자리 지우기"
        >
          <Delete className="size-6" />
        </Button>
      </div>
    </div>
  );
}
