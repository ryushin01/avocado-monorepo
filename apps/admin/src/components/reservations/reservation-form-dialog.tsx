"use client";

import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";

import { Button } from "@avocado/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";
import { Textarea } from "@avocado/ui/components/textarea";

import { saveReservationAction } from "@/app/(backoffice)/reservations/actions";
import { FormErrorAlert } from "@/components/form/form-error-alert";
import { useDialogForm } from "@/components/form/use-dialog-form";
import { formatPhone } from "@/lib/guests/contact";
import { toKstDate } from "@/lib/plays/time";
import type { Reservation } from "@/lib/reservations/types";

const STATUS_ITEMS = [
  { value: "confirmed", label: "확정" },
  { value: "pending", label: "가예약" },
];

/** ISO → 한국 시각 "HH:mm" */
const kstTime = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(11, 16);

function toFormValues(reservation: Reservation | undefined, date: string) {
  if (!reservation) {
    return { name: "", phone: "", partySize: "2", date, time: "18:00", memo: "", status: "confirmed" };
  }
  return {
    name: reservation.name,
    phone: formatPhone(reservation.phone),
    partySize: String(reservation.partySize),
    date: toKstDate(Date.parse(reservation.startsAt)),
    time: kstTime(reservation.startsAt),
    memo: reservation.memo ?? "",
    status: reservation.status === "pending" ? "pending" : "confirmed",
  };
}

/** 예약 등록·수정 창. reservation이 있으면 수정이다. */
export function ReservationFormDialog({
  cafeId,
  reservation,
  date,
  open,
  onOpenChange,
  trigger,
}: {
  cafeId: string;
  reservation?: Reservation;
  /** 새 예약의 기본 날짜 (목록에서 보고 있는 날) */
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
}) {
  const form = useDialogForm(saveReservationAction.bind(null, cafeId, reservation?.id ?? null), {
    defaults: toFormValues(reservation, date),
    onSuccess: () => onOpenChange(false),
  });

  const field = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={form.invalid(name)}>
      <FieldLabel htmlFor={`reservation-${name}`}>{label}</FieldLabel>
      <Input
        id={`reservation-${name}`}
        name={name}
        autoComplete="off"
        defaultValue={form.text(name)}
        aria-invalid={form.invalid(name)}
        {...props}
      />
      <FieldError errors={form.errors(name)} />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>{reservation ? "예약 수정" : "예약 등록"}</DialogTitle>
            <DialogDescription>
              전화 등으로 받은 예약을 기록합니다. 손님은 키오스크에서 전화번호 뒷자리로 예약을 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />
            <div className="grid grid-cols-2 gap-4">
              {field("name", "이름")}
              {field("partySize", "인원", { type: "number", inputMode: "numeric", min: 1 })}
            </div>
            {field("phone", "휴대전화", { type: "tel", inputMode: "tel", placeholder: "010-1234-5678" })}
            <div className="grid grid-cols-2 gap-4">
              {field("date", "날짜", { type: "date" })}
              {field("time", "시각", { type: "time", step: 1800 })}
            </div>
            {!(reservation && reservation.status === "confirmed") && (
              <Field data-invalid={form.invalid("status")}>
                <FieldLabel htmlFor="reservation-status">상태</FieldLabel>
                <Select name="status" items={STATUS_ITEMS} defaultValue={form.text("status")}>
                  <SelectTrigger id="reservation-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={form.errors("status")} />
              </Field>
            )}
            <Field data-invalid={form.invalid("memo")}>
              <FieldLabel htmlFor="reservation-memo">메모 (선택)</FieldLabel>
              <Textarea
                id="reservation-memo"
                name="memo"
                rows={2}
                defaultValue={form.text("memo")}
                aria-invalid={form.invalid("memo")}
              />
              <FieldError errors={form.errors("memo")} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>취소</DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2 className="animate-spin" />}
              {reservation ? "저장" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
