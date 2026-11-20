import Form from "next/form";

import type { BookingOptions } from "@avocado/domain/booking";
import { Button } from "@avocado/ui/components/button";
import { Field, FieldError, FieldLabel } from "@avocado/ui/components/field";
import { NativeSelect, NativeSelectOption } from "@avocado/ui/components/native-select";
import { errorIdOf, fieldA11y } from "@avocado/ui/lib/field-a11y";

import { formatBookingDate, type BookingQuery } from "../model/booking-query";

/** 손님 화면이라 선택 상자를 크게(높이 44px) 쓴다. */
const SELECT = "w-full [&_select]:h-11 [&_select]:text-base";

/**
 * 1단계: 매장·날짜·인원. 주소(GET)로 보내므로 JS 없이도 동작하고, 고른 값이 주소에 남아 뒤로 가기·공유가 된다.
 * 바꾸는 것만으로 화면이 바뀌지 않고 '빈 시간 보기'를 눌러야 찾는다(KWCAG 7.2.1).
 */
export function BookingSearch({ options, query, today }: { options: BookingOptions; query: BookingQuery; today: string }) {
  const cafeMissing = query.submitted && !query.cafe;
  return (
    <section aria-labelledby="booking-step-1" className="flex flex-col gap-4">
      <h2 id="booking-step-1" className="text-xl font-bold">
        1. 매장·날짜·인원
      </h2>
      <Form action="/reservation" className="grid gap-4 md:grid-cols-[2fr_2fr_1fr] md:items-start">
        <Field data-invalid={cafeMissing}>
          <FieldLabel htmlFor="booking-cafe">매장</FieldLabel>
          <NativeSelect
            id="booking-cafe"
            name="cafe"
            defaultValue={query.cafe?.id ?? ""}
            className={SELECT}
            {...fieldA11y("booking-cafe", cafeMissing)}
          >
            <NativeSelectOption value="" disabled>
              매장을 골라 주세요
            </NativeSelectOption>
            {options.cafes.map((cafe) => (
              <NativeSelectOption key={cafe.id} value={cafe.id}>
                {cafe.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError
            id={errorIdOf("booking-cafe")}
            errors={cafeMissing ? [{ message: "매장을 골라 주세요." }] : undefined}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="booking-date">날짜</FieldLabel>
          <NativeSelect id="booking-date" name="date" defaultValue={query.date ?? options.dates[0]} className={SELECT}>
            {options.dates.map((date) => (
              <NativeSelectOption key={date} value={date}>
                {formatBookingDate(date, today)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="booking-people">인원</FieldLabel>
          <NativeSelect id="booking-people" name="people" defaultValue={String(query.partySize ?? 2)} className={SELECT}>
            {Array.from({ length: options.maxPartySize }, (_, i) => i + 1).map((n) => (
              <NativeSelectOption key={n} value={n}>
                {n}명
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Button type="submit" size="lg" className="md:col-span-3 md:justify-self-start">
          빈 시간 보기
        </Button>
      </Form>
      <p className="text-sm text-muted-foreground">
        {formatBookingDate(options.dates[0])}부터 {formatBookingDate(options.dates[options.dates.length - 1])}까지 예약할 수
        있습니다. {options.maxPartySize}명이 넘으면 매장으로 전화해 주세요.
      </p>
    </section>
  );
}
