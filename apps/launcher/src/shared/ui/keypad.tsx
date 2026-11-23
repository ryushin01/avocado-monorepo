"use client";

import { Delete } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@avocado/ui/components/button";
import { cn } from "@avocado/ui/lib/utils";

import { kioskOutlineButton } from "./kiosk-header";

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
  const labelId = useId();

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
      <p className="text-center text-lg" id={labelId}>
        {label}
      </p>
      {/* 네모 칸은 보이는 표시만 하고, 화면 낭독기에는 아래 상태 문구로 몇 자리를 눌렀는지 알린다. */}
      <div className="flex justify-center gap-3" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={cn(
              // 레퍼런스의 밑줄 칸: 아래 선만 두고, 채운 칸은 선을 밝게 한다.
              "flex h-16 w-14 items-end justify-center border-b-2 pb-1 text-4xl tabular-nums transition-colors duration-300",
              i < digits.length ? "border-foreground" : "border-input text-muted-foreground",
            )}
          >
            {digits[i] ?? ""}
          </span>
        ))}
      </div>
      <p role="status" className="sr-only">
        {digits ? `${digits.length}자리 입력: ${[...digits].join(" ")}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-3" role="group" aria-labelledby={labelId}>
        {KEYS.map((k) => (
          <Button key={k} variant="outline" className={cn(kioskOutlineButton, "h-16 text-2xl")} disabled={disabled} onClick={() => press(k)}>
            {k}
          </Button>
        ))}
        <Button variant="ghost" className="h-16 rounded-[5px] text-base font-normal" disabled={disabled} onClick={() => press("clear")}>
          지우기
        </Button>
        <Button variant="outline" className={cn(kioskOutlineButton, "h-16 text-2xl")} disabled={disabled} onClick={() => press("0")}>
          0
        </Button>
        <Button
          variant="ghost"
          className="h-16 rounded-[5px]"
          disabled={disabled}
          onClick={() => press("back")}
          aria-label="한 자리 지우기"
        >
          <Delete className="size-6" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
