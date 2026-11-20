import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveUpdates } from "./live-updates";

const refresh = vi.fn();
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh }),
}));

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("LiveUpdates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  it("화면이 보이는 동안 15초마다 다시 받고, 숨으면 멈췄다가 돌아오면 바로 받는다", () => {
    render(<LiveUpdates waiting={[]} arrived={[]} />);
    vi.advanceTimersByTime(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    setVisibility("hidden");
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    setVisibility("visible");
    expect(refresh).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(15_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("새 대기와 도착만 알리고, 알림 영역은 처음부터 있다", () => {
    const first = { id: "w1", label: "1번 김철수" };
    const { rerender } = render(<LiveUpdates waiting={[first]} arrived={[]} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");

    act(() => {
      rerender(
        <LiveUpdates
          waiting={[first, { id: "w2", label: "2번 이영희" }]}
          arrived={[{ id: "r1", label: "19:00 예약 박민수" }]}
        />,
      );
    });
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("현장 대기 2번 이영희님이 등록했습니다. 19:00 예약 박민수님이 도착을 알렸습니다.");

    // 줄에서 빠진 것만 있으면 알림을 바꾸지 않는다.
    act(() => {
      rerender(<LiveUpdates waiting={[first]} arrived={[{ id: "r1", label: "19:00 예약 박민수" }]} />);
    });
    expect(status).toHaveTextContent("2번 이영희");
  });

  it("보고 있는 날짜에 새로 들어온 온라인 예약을 알리고, 날짜를 바꿨을 때는 그날의 예약을 새것으로 알리지 않는다", () => {
    const old = { id: "r1", label: "13:00 김철수님 2명" };
    const { rerender } = render(<LiveUpdates waiting={[]} arrived={[]} booked={[old]} bookedDate="2026-11-21" />);
    const status = screen.getByRole("status");

    act(() => {
      rerender(
        <LiveUpdates
          waiting={[]}
          arrived={[]}
          booked={[old, { id: "r2", label: "18:30 이영희님 3명" }]}
          bookedDate="2026-11-21"
        />,
      );
    });
    expect(status).toHaveTextContent("새 온라인 예약: 18:30 이영희님 3명.");

    act(() => {
      rerender(
        <LiveUpdates waiting={[]} arrived={[]} booked={[{ id: "r9", label: "19:00 박민수님 4명" }]} bookedDate="2026-11-22" />,
      );
    });
    expect(status).not.toHaveTextContent("박민수");
  });
});
