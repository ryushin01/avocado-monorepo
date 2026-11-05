"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@avocado/ui/components/button";

import { ReservationFormDialog } from "./reservation-form-dialog";

export function CreateReservationButton({ cafeId, date }: { cafeId: string; date: string }) {
  const [open, setOpen] = useState(false);
  return (
    <ReservationFormDialog
      cafeId={cafeId}
      date={date}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <CalendarPlus />
          예약 등록
        </Button>
      }
    />
  );
}
