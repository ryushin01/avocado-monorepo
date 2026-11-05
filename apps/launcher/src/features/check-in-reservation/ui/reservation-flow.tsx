"use client";

import { CalendarCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import type { KioskReservation } from "@avocado/domain/kiosk";
import { Badge } from "@avocado/ui/components/badge";
import { Button } from "@avocado/ui/components/button";
import { Card, CardContent } from "@avocado/ui/components/card";

import { checkInAction, lookupReservationsAction } from "@/shared/api/kiosk-actions";
import { formatKstTime } from "@/shared/lib/format";

import { Keypad } from "@/shared/ui/keypad";

type Step =
  | { name: "enter"; message?: string }
  | { name: "results"; phone4: string; reservations: KioskReservation[] }
  | { name: "arrived"; reservation: KioskReservation };

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

  if (step.name === "arrived") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 className="size-16 text-emerald-600" />
        <h2 className="text-3xl font-bold">도착을 알렸습니다</h2>
        <p className="text-lg text-muted-foreground">
          {step.reservation.maskedName}님, {formatKstTime(step.reservation.startsAt)} 예약 {step.reservation.partySize}명. 직원이 곧 자리로 안내해드립니다.
        </p>
        <Button size="lg" className="h-12 px-6 text-base" onClick={() => setStep({ name: "enter" })}>
          처음으로
        </Button>
      </div>
    );
  }

  if (step.name === "results") {
    const { phone4, reservations } = step;
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">
          뒷자리 {phone4}로 찾은 오늘 예약 {reservations.length}건
        </h2>
        {reservations.length === 0 ? (
          <p className="rounded-xl border bg-background p-8 text-center text-lg text-muted-foreground">
            오늘 예약을 찾을 수 없습니다. 번호를 다시 확인하시거나 직원에게 문의해주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reservations.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4">
                    <CalendarCheck className="size-8 text-muted-foreground" />
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="text-xl font-semibold">
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
                      className="h-12 px-6 text-base"
                      disabled={pending || r.arrived}
                      onClick={() => checkIn(phone4, r)}
                    >
                      {pending && <Loader2 className="animate-spin" />}
                      도착했어요
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" size="lg" className="h-12 self-start px-6 text-base" onClick={() => setStep({ name: "enter" })}>
          다시 입력
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {step.message && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-center text-destructive">
          {step.message}
        </p>
      )}
      <Keypad label="예약하신 휴대전화 번호 뒷자리 4자리를 눌러주세요" disabled={pending} onComplete={lookup} />
      {pending && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-label="찾는 중" />}
    </div>
  );
}
