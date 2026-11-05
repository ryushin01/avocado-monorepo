import { CircleCheck, Timer, Wrench } from "lucide-react";

import type { KioskGame } from "@avocado/domain/kiosk";
import { Badge } from "@avocado/ui/components/badge";

/** 게임의 지금 상태. 색만으로 구분하지 않도록 아이콘과 문구를 함께 둔다. */
export function AvailabilityBadge({ game }: { game: KioskGame }) {
  if (game.availability === "available") {
    return (
      <Badge className="bg-emerald-600 text-white">
        <CircleCheck />
        이용 가능 · 남은 {game.availableCount}개
      </Badge>
    );
  }
  if (game.availability === "in-use") {
    return (
      <Badge variant="secondary">
        <Timer />
        모두 이용 중
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Wrench />
      점검 중
    </Badge>
  );
}
