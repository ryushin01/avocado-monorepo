import { fetchBookingAvailability, fetchBookingOptions } from "@/shared/api";

import { formatBookingDate, kstToday, parseBookingQuery } from "../model/booking-query";
import { BookingForm } from "./booking-form";
import { BookingSearch } from "./booking-search";
import { BookingUnavailable } from "./booking-unavailable";

/** 예약 단계. 선택지와 빈 시각은 요청마다 백오피스에서 받는다. */
export async function BookingSteps({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, options] = await Promise.all([searchParams, fetchBookingOptions()]);
  if (!options.ok) return <BookingUnavailable reason={options.reason} />;
  if (options.data.cafes.length === 0 || options.data.dates.length === 0) return <BookingUnavailable reason="off" />;

  const query = parseBookingQuery(params, options.data);
  const today = kstToday();
  const { cafe, date, partySize } = query;
  const availability = cafe && date && partySize ? await fetchBookingAvailability(cafe.id, date, partySize) : null;

  // 검색 결과는 늘 같은 자리의 상태 영역으로 알린다. 주소만 바뀌는 이동(빈 시간 보기)에서 React가 이 영역의
  // 내용만 바꾸므로 화면 낭독기가 읽는다. 결과 영역(2단계)은 새로 생기므로 거기에 role을 두지 않는다.
  const result =
    cafe && date && partySize && availability?.ok
      ? (() => {
          const open = availability.data.slots.filter((slot) => slot.available).length;
          return open > 0
            ? `${cafe.name} ${formatBookingDate(date, today)} ${partySize}명: 빈 시간 ${open}개를 찾았습니다.`
            : // 날짜만 바꿔 다시 찾아도 빈 결과 문구가 달라지게(같은 글자면 다시 읽히지 않음) 매장·날짜를 넣는다.
              `${cafe.name} ${formatBookingDate(date, today)}: ${partySize}명이 앉을 빈 시간이 없습니다. 다른 날짜나 매장을 골라 주세요.`;
        })()
      : "";

  return (
    <>
      <BookingSearch options={options.data} query={query} today={today} />
      <p role="status" className="sr-only">
        {result}
      </p>
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
            <p>이날은 {partySize}명이 앉을 빈 시간이 없습니다. 다른 날짜나 매장을 골라 주세요.</p>
          )}
        </section>
      )}
    </>
  );
}
