"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, type Ref } from "react";

import type { BookingCafe, BookingResult, BookingSlot } from "@avocado/domain/booking";
import { Button, buttonVariants } from "@avocado/ui/components/button";
import { Checkbox } from "@avocado/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@avocado/ui/components/radio-group";
import { Textarea } from "@avocado/ui/components/textarea";
import { descriptionIdOf, errorIdOf, fieldA11y } from "@avocado/ui/lib/field-a11y";

import { bookAction, type BookingFormState, type BookingFormValues } from "../api/actions";
import { formatVisit } from "../model/booking-query";

const IDLE: BookingFormState = { status: "idle" };
const EMPTY: BookingFormValues = { time: "", name: "", phone: "", memo: "", agreed: false };
/** 오류가 나면 이 순서로 첫 칸에 초점을 옮긴다(KWCAG 7.3.1). */
const FIELD_ORDER = ["time", "name", "phone", "memo", "agreed"] as const;
const id = (field: string) => `booking-${field}`;

/** 2단계: 시각과 연락처를 받아 예약한다. 예약되면 완료 안내로 바뀐다. */
export function BookingForm({
  cafe,
  date,
  partySize,
  slots: initialSlots,
}: {
  cafe: BookingCafe;
  date: string;
  partySize: number;
  slots: BookingSlot[];
}) {
  const [state, formAction, pending] = useActionState(bookAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.status === "success") return void doneRef.current?.focus();
    if (state.status !== "error") return;
    const first = FIELD_ORDER.find((field) => state.fieldErrors[field]?.length);
    if (!first) return;
    const form = formRef.current;
    // 시각은 고른 것(없으면 고를 수 있는 첫 시각)으로, 나머지는 오류 문구를 이은 칸(aria-errormessage)으로 옮긴다.
    const target =
      first === "time"
        ? (form?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
          form?.querySelector<HTMLElement>('[role="radio"]:not([data-disabled])'))
        : form?.querySelector<HTMLElement>(`[aria-errormessage="${errorIdOf(id(first))}"]`);
    target?.focus();
  }, [state]);

  if (state.status === "success") return <BookingDone ref={doneRef} cafe={cafe} reservation={state.reservation} />;

  const error = state.status === "error" ? state : null;
  const values = error?.values ?? EMPTY;
  const slots = error?.slots ?? initialSlots;
  const errors = (field: string) => error?.fieldErrors[field]?.map((message) => ({ message }));
  const invalid = (field: string) => Boolean(error?.fieldErrors[field]?.length);
  const hasFieldErrors = FIELD_ORDER.some(invalid);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        // 보낼 때마다 다시 그려 입력값을 되살린다(폼 액션은 끝나면 칸을 비운다).
        key={error?.attempt ?? 0}
        action={formAction}
        noValidate
        className="flex flex-col gap-8"
      >
        <input type="hidden" name="cafe" value={cafe.id} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="partySize" value={partySize} />

        <FieldSet data-invalid={invalid("time")}>
          <FieldLegend id={`${id("time")}-legend`}>방문 시각</FieldLegend>
          <FieldDescription id={descriptionIdOf(id("time"))}>
            예약하면 2시간 동안 테이블 하나를 맡아 둡니다. &lsquo;마감&rsquo;은 빈 테이블이 없는 시각입니다.
          </FieldDescription>
          <RadioGroup
            name="time"
            defaultValue={values.time || undefined}
            aria-labelledby={`${id("time")}-legend`}
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
            {...fieldA11y(id("time"), invalid("time"), { described: true })}
          >
            {slots.map((slot) => {
              const slotId = `${id("time")}-${slot.time.replace(":", "")}`;
              return (
                <FieldLabel
                  key={slot.time}
                  htmlFor={slotId}
                  className="flex min-h-11 items-center gap-2 rounded-lg border px-3 has-data-checked:border-primary has-data-checked:bg-primary/5 has-data-disabled:text-muted-foreground"
                >
                  <RadioGroupItem id={slotId} value={slot.time} disabled={!slot.available} />
                  <span className="tabular-nums">{slot.time}</span>
                  {!slot.available && <span className="text-xs">마감</span>}
                </FieldLabel>
              );
            })}
          </RadioGroup>
          <FieldError id={errorIdOf(id("time"))} errors={errors("time")} />
        </FieldSet>

        <FieldGroup className="max-w-xl">
          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor={id("name")}>이름</FieldLabel>
            <Input
              id={id("name")}
              name="name"
              autoComplete="name"
              maxLength={20}
              defaultValue={values.name}
              className="h-11"
              {...fieldA11y(id("name"), invalid("name"))}
            />
            <FieldError id={errorIdOf(id("name"))} errors={errors("name")} />
          </Field>
          <Field data-invalid={invalid("phone")}>
            <FieldLabel htmlFor={id("phone")}>휴대전화</FieldLabel>
            <Input
              id={id("phone")}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="010-1234-5678"
              defaultValue={values.phone}
              className="h-11"
              {...fieldA11y(id("phone"), invalid("phone"), { described: true })}
            />
            <FieldDescription id={descriptionIdOf(id("phone"))}>
              매장에 도착하시면 키오스크에서 이 번호의 뒷자리 4자리로 예약을 확인합니다.
            </FieldDescription>
            <FieldError id={errorIdOf(id("phone"))} errors={errors("phone")} />
          </Field>
          <Field data-invalid={invalid("memo")}>
            <FieldLabel htmlFor={id("memo")}>요청 사항 (선택)</FieldLabel>
            <Textarea
              id={id("memo")}
              name="memo"
              rows={2}
              maxLength={100}
              defaultValue={values.memo}
              {...fieldA11y(id("memo"), invalid("memo"))}
            />
            <FieldError id={errorIdOf(id("memo"))} errors={errors("memo")} />
          </Field>
          <Field orientation="horizontal" data-invalid={invalid("agreed")}>
            <Checkbox
              id={id("agreed")}
              name="agreed"
              defaultChecked={values.agreed}
              {...fieldA11y(id("agreed"), invalid("agreed"), { described: true })}
            />
            <FieldContent>
              <FieldLabel htmlFor={id("agreed")}>개인정보 수집·이용에 동의합니다 (필수)</FieldLabel>
              <FieldDescription id={descriptionIdOf(id("agreed"))}>
                예약 확인과 방문 안내를 위해 이름, 휴대전화 번호, 예약 내용(매장·일시·인원·요청 사항)을 받습니다. 방문
                예정일로부터 90일이 지나면 지웁니다. 동의하지 않으시면 매장으로 전화해 예약하실 수 있습니다.
              </FieldDescription>
              <FieldError id={errorIdOf(id("agreed"))} errors={errors("agreed")} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <Button type="submit" size="lg" className="self-start" disabled={pending}>
          {pending ? "예약하는 중…" : "예약하기"}
        </Button>
      </form>
      {/* 칸과 관계없는 오류(연결 문제 등)는 처음부터 있는 알림 영역에서 읽힌다. 칸 오류는 칸 아래에 있다. */}
      <div role="alert" aria-atomic="true" className="text-sm font-medium text-destructive">
        {error && !hasFieldErrors ? error.message : ""}
      </div>
    </div>
  );
}

function BookingDone({
  ref,
  cafe,
  reservation,
}: {
  ref: Ref<HTMLHeadingElement>;
  cafe: BookingCafe;
  reservation: BookingResult["reservation"];
}) {
  return (
    <section aria-labelledby="booking-done-title" className="flex flex-col gap-5 rounded-lg border p-6">
      <h2 id="booking-done-title" ref={ref} tabIndex={-1} className="text-2xl font-bold">
        예약했습니다
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-muted-foreground">매장</dt>
        <dd>{reservation.cafeName}</dd>
        <dt className="text-muted-foreground">방문</dt>
        <dd className="tabular-nums">{formatVisit(reservation.startsAt)} (2시간)</dd>
        <dt className="text-muted-foreground">인원</dt>
        <dd>{reservation.partySize}명</dd>
        <dt className="text-muted-foreground">테이블</dt>
        <dd>{reservation.table}</dd>
      </dl>
      <p className="text-muted-foreground">
        도착하시면 매장 키오스크의 &lsquo;예약 확인&rsquo;에서 휴대전화 뒷자리로 도착을 알려 주세요. 시간을 바꾸거나
        취소하시려면 매장으로 전화해 주세요
        {cafe.phone && (
          <>
            {" "}
            (
            <a href={`tel:${cafe.phone}`} className="underline underline-offset-4">
              {cafe.phone}
            </a>
            )
          </>
        )}
        .
      </p>
      <Link href="/" className={`${buttonVariants({ variant: "outline" })} self-start`}>
        홈으로
      </Link>
    </section>
  );
}
