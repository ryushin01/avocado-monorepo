import { fetchBookingAvailability, fetchBookingOptions } from "@/shared/api";

import { formatBookingDate, parseBookingQuery } from "../model/booking-query";
import { BookingForm } from "./booking-form";
import { BookingSearch } from "./booking-search";
import { BookingUnavailable } from "./booking-unavailable";

/** 한국 날짜 YYYY-MM-DD */
const kstToday = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);

/** 예약 단계. 선택지와 빈 시각은 요청마다 백오피스에서 받는다. */
export async function BookingSteps({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, options] = await Promise.all([searchParams, fetchBookingOptions()]);
  if (!options.ok) return <BookingUnavailable reason={options.reason} />;
  if (options.data.cafes.length === 0 || options.data.dates.length === 0) return <BookingUnavailable reason="off" />;

  const query = parseBookingQuery(params, options.data);
  const today = kstToday();
  const { cafe, date, partySize } = query;
  const availability = cafe && date && partySize ? await fetchBookingAvailability(cafe.id, date, partySize) : null;

  return (
    <>
      <BookingSearch options={options.data} query={query} today={today} />
      {cafe && date && partySize && availability && (
        <section aria-labelledby="booking-step-2" className="flex flex-col gap-4">
          <h2 id="booking-step-2" className="text-xl font-bold">
            2. 시간과 연락처
          </h2>
          <p className="text-muted-foreground">
            {cafe.name} · {formatBookingDate(date, today)} · {partySize}명
          </p>
          {!availability.ok ? (
            <BookingUnavailable reason={availability.reason} message={availability.error?.message} />
          ) : availability.data.slots.some((slot) => slot.available) ? (
            <BookingForm
              // 매장·날짜·인원을 바꾸면 새 폼으로 시작한다.
              key={`${cafe.id}:${date}:${partySize}`}
              cafe={cafe}
              date={date}
              partySize={partySize}
              slots={availability.data.slots}
            />
          ) : (
            <p role="status">
              이날은 {partySize}명이 앉을 빈 시간이 없습니다. 다른 날짜나 매장을 골라 주세요.
            </p>
          )}
        </section>
      )}
    </>
  );
}
