"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@avocado/ui/components/button";

import type { CafeTable } from "@/entities/cafe";

import { ReservationFormDialog } from "./reservation-form-dialog";

export function CreateReservationButton({ cafeId, date, tables }: { cafeId: string; date: string; tables: CafeTable[] }) {
  const [open, setOpen] = useState(false);
  return (
    <ReservationFormDialog
      cafeId={cafeId}
      date={date}
      tables={tables}
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
