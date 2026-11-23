"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";

import type { KioskReservation } from "@avocado/domain/kiosk";
import { Badge } from "@avocado/ui/components/badge";
import { Button } from "@avocado/ui/components/button";
import { cn } from "@avocado/ui/lib/utils";

import { checkInAction, lookupReservationsAction } from "@/shared/api";
import { formatKstTime } from "@/shared/lib/format";

import { AlertMessage } from "@/shared/ui/alert-message";
import { IdleReturn } from "@/shared/ui/idle-return";
import { Keypad } from "@/shared/ui/keypad";
import { kioskOutlineButton, kioskSolidButton, MonoLabel } from "@/shared/ui/kiosk-header";

type Step =
  | { name: "enter"; message?: string }
  | { name: "results"; phone4: string; reservations: KioskReservation[] }
  | { name: "arrived"; reservation: KioskReservation };

/** 손님 정보(가린 이름·시각·뒷자리)가 보이는 결과 화면에서 경고를 띄우기까지의 시간(그 뒤 20초 안에 연장하지 않으면 처음 화면) */
const RESULT_SECONDS = 30;

/** 예약 확인: 뒷자리 입력 → 내 예약 고르기 → 도착 알리기 */
export function ReservationFlow() {
  const [step, setStep] = useState<Step>({ name: "enter" });
  const [pending, startTransition] = useTransition();

  const lookup = (phone4: string) =>
    startTransition(async () => {
      const result = await lookupReservationsAction(phone4);
      if (!result.ok) return setStep({ name: "enter", message: "예약을 불러오지 못했습니다. 직원에게 문의해주세요." });
      setStep({ name: "results", phone4, reservations: result.data.reservations });
    });

  const checkIn = (phone4: string, reservation: KioskReservation) =>
    startTransition(async () => {
      const result = await checkInAction(reservation.id, phone4);
      if (!result.ok) {
        return setStep({ name: "enter", message: result.error?.message ?? "도착을 알리지 못했습니다. 직원에게 문의해주세요." });
      }
      setStep({ name: "arrived", reservation: result.data.reservation });
    });

  let content: ReactNode;
  if (step.name === "arrived") {
    content = (
      <div className="flex flex-col items-start gap-5 rounded-[10px] border border-input p-10">
        <CheckCircle2 aria-hidden strokeWidth={1} className="size-14 text-emerald-400" />
        <h2 className="text-4xl tracking-[-0.02em]">도착을 알렸습니다</h2>
        <p className="text-lg text-muted-foreground">
          {step.reservation.maskedName}님, {formatKstTime(step.reservation.startsAt)} 예약 {step.reservation.partySize}명. 직원이 곧 자리로 안내해드립니다.
        </p>
        <Button size="lg" className={cn(kioskSolidButton, "h-12 px-7 text-base")} onClick={() => setStep({ name: "enter" })}>
          처음으로
        </Button>
      </div>
    );
  } else if (step.name === "results") {
    const { phone4, reservations } = step;
    content = (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl">
          뒷자리 {phone4}로 찾은 오늘 예약 {reservations.length}건
        </h2>
        {reservations.length === 0 ? (
          <p className="rounded-[10px] border border-input p-8 text-center text-lg text-muted-foreground">
            오늘 예약을 찾을 수 없습니다. 번호를 다시 확인하시거나 직원에게 문의해주세요.
          </p>
        ) : (
          <ul className="flex flex-col">
            {reservations.map((r, i) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 border-b border-input py-5">
                <div className="flex flex-1 flex-col gap-2">
                  <MonoLabel>
                    <span aria-hidden>Booking /0{i + 1}</span>
                  </MonoLabel>
                  <p className="text-2xl tracking-[-0.01em]">
                    {r.maskedName}님 · {formatKstTime(r.startsAt)} · {r.partySize}명
                  </p>
                  <div className="flex gap-1">
                    <Badge variant={r.status === "confirmed" ? "default" : "outline"}>
                      {r.status === "confirmed" ? "예약 확정" : "확정 대기"}
                    </Badge>
                    {r.arrived && <Badge variant="secondary">도착 알림 완료</Badge>}
                  </div>
                </div>
                <Button
                  size="lg"
                  className={cn(kioskSolidButton, "h-12 px-7 text-base")}
                  disabled={pending || r.arrived}
                  onClick={() => checkIn(phone4, r)}
                >
                  {pending && <Loader2 className="animate-spin" />}
                  도착했어요
                  <ArrowRight aria-hidden strokeWidth={1.5} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="outline"
          size="lg"
          className={cn(kioskOutlineButton, "h-12 self-start px-7 text-base")}
          onClick={() => setStep({ name: "enter" })}
        >
          다시 입력
        </Button>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-4">
        <Keypad label="예약하신 휴대전화 번호 뒷자리 4자리를 눌러주세요" disabled={pending} onComplete={lookup} />
        {pending && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-label="찾는 중" />}
      </div>
    );
  }

  // 오류 알림은 단계가 바뀌어도 그대로 두고 내용만 바꾼다(오류와 함께 새로 생긴 영역은 화면 낭독기가 놓칠 수 있다).
  return (
    <div className="flex flex-col gap-4">
      {/* 조회 결과·도착 완료 화면은 다음 손님이 보지 않게 30초 동안 만지지 않으면 경고하고, 연장하지 않으면 처음 화면으로 돌아간다. */}
      {step.name !== "enter" && <IdleReturn seconds={RESULT_SECONDS} />}
      <AlertMessage message={step.name === "enter" ? step.message : undefined} className="text-center" />
      {content}
    </div>
  );
}
