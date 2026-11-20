import { Phone } from "lucide-react";

import { STORES } from "@/shared/config";

/** 온라인 예약을 열지 않았거나 예약 서버에 닿지 않을 때. 매장 전화번호로 안내한다. */
export function BookingUnavailable({ reason, message }: { reason: "off" | "unreachable" | "rejected"; message?: string }) {
  const lead =
    message ??
    (reason === "unreachable"
      ? "예약 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : "지금은 온라인 예약을 받지 않습니다.");
  return (
    <section aria-labelledby="booking-unavailable-title" className="flex flex-col gap-4 rounded-lg border p-6">
      <h2 id="booking-unavailable-title" className="text-xl font-bold">
        전화로 예약해 주세요
      </h2>
      <p className="text-muted-foreground">{lead} 매장으로 전화하시면 바로 예약해 드립니다.</p>
      <ul className="flex flex-col gap-2">
        {STORES.map((store) => (
          <li key={store.name} className="flex flex-wrap items-center gap-x-3">
            <span className="font-bold">{store.name}</span>
            <a
              href={`tel:${store.phone}`}
              className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
            >
              <Phone aria-hidden className="size-4" />
              {store.phone}
            </a>
            <span className="text-sm text-muted-foreground">{store.hours}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
