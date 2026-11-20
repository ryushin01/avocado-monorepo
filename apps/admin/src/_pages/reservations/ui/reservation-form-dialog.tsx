"use client";

import { useState, type ReactElement } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";
import { Textarea } from "@avocado/ui/components/textarea";

import { saveReservationAction } from "../api/actions";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { useDialogForm } from "@/shared/lib/use-dialog-form";
import { formatPhone } from "@/entities/guest";
import { toKstDate } from "@/shared/lib/kst-time";
import type { Reservation } from "@/entities/reservation";
import type { CafeTable } from "@/entities/cafe";
import { FormTextField } from "@/shared/ui/form-text-field";
import { DialogFormFooter } from "@/shared/ui/dialog-form-footer";
import { descriptionIdOf, errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";

const STATUS_ITEMS = [
  { value: "confirmed", label: "확정" },
  { value: "pending", label: "가예약" },
];

/**
 * 테이블 선택지: 자동 배정, 배정 안 함, 쓰는 테이블. 지금 배정된 테이블은 쓰지 않게 됐어도 남겨 그대로 둘 수 있게 한다.
 */
function tableItems(tables: CafeTable[], current?: string) {
  return [
    { value: "auto", label: "자동 배정 (빈 테이블)" },
    { value: "none", label: "배정 안 함" },
    ...tables
      .filter((t) => t.active || t.id === current)
      .map((t) => ({ value: t.id, label: `${t.label} · ${t.seats}석${t.active ? "" : " (쓰지 않음)"}` })),
  ];
}

/** ISO → 한국 시각 "HH:mm" */
const kstTime = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(11, 16);

function toFormValues(reservation: Reservation | undefined, date: string) {
  if (!reservation) {
    return { name: "", phone: "", partySize: "2", date, time: "18:00", memo: "", status: "confirmed", table: "auto" };
  }
  return {
    name: reservation.name,
    phone: formatPhone(reservation.phone),
    partySize: String(reservation.partySize),
    date: toKstDate(Date.parse(reservation.startsAt)),
    time: kstTime(reservation.startsAt),
    memo: reservation.memo ?? "",
    status: reservation.status === "pending" ? "pending" : "confirmed",
    table: reservation.tableId ?? "none",
  };
}

/** 예약 등록·수정 창. reservation이 있으면 수정이다. */
export function ReservationFormDialog({
  cafeId,
  reservation,
  date,
  tables,
  open,
  onOpenChange,
  trigger,
}: {
  cafeId: string;
  reservation?: Reservation;
  /** 새 예약의 기본 날짜 (목록에서 보고 있는 날) */
  date: string;
  /** 매장의 테이블 (쓰지 않는 것 포함) */
  tables: CafeTable[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {/* 창을 열 때마다 새로 마운트되어 그때의 값·버전으로 시작한다. */}
        <ReservationForm
          cafeId={cafeId}
          reservation={reservation}
          date={date}
          tables={tables}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReservationForm({
  cafeId,
  reservation: latest,
  date,
  tables: latestTables,
  onSaved,
}: {
  cafeId: string;
  reservation?: Reservation;
  date: string;
  tables: CafeTable[];
  onSaved: () => void;
}) {
  // 창을 연 시점의 예약. 열려 있는 동안 목록이 다시 받아져도(15초 자동 갱신) 이 값과 버전을 쓰고,
  // 그사이 다른 직원이 고쳤다면 저장할 때 서버가 버전으로 알아채 덮어쓰지 않는다.
  const [reservation] = useState(latest);
  const [defaults] = useState(() => toFormValues(reservation, date));
  // 선택지도 창을 연 시점으로 고정한다. 자동 갱신으로 목록이 바뀌어도 고른 값이 사라지지 않는다.
  const [tableChoices] = useState(() => tableItems(latestTables, reservation?.tableId));
  const form = useDialogForm(saveReservationAction.bind(null, cafeId, reservation?.id ?? null), {
    defaults,
    onSuccess: onSaved,
  });

  const field = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormTextField formState={form} idPrefix="reservation" name={name} label={label} {...props} />
  );

  return (
    <form key={form.formKey} action={form.formAction} noValidate>
      {reservation && <input type="hidden" name="version" value={reservation.version} />}
      <DialogHeader>
        <DialogTitle>{reservation ? "예약 수정" : "예약 등록"}</DialogTitle>
        <DialogDescription>
          전화 등으로 받은 예약을 기록합니다. 손님은 키오스크에서 전화번호 뒷자리로 예약을 확인합니다. 예약은 테이블
          하나를 2시간 씁니다.
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
              <SelectTrigger
                id="reservation-status"
                className="w-full"
                {...fieldA11y("reservation-status", form.invalid("status"))}
              >
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
            <FieldError id={errorIdOf("reservation-status")} errors={form.errors("status")} />
          </Field>
        )}
        <Field data-invalid={form.invalid("table")}>
          <FieldLabel htmlFor="reservation-table">테이블</FieldLabel>
          <Select name="table" items={tableChoices} defaultValue={form.text("table")}>
            <SelectTrigger
              id="reservation-table"
              className="w-full"
              {...fieldA11y("reservation-table", form.invalid("table"), { described: true })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tableChoices.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription id={descriptionIdOf("reservation-table")}>
            자동 배정은 인원이 앉을 수 있는 가장 작은 빈 테이블을 고릅니다.
          </FieldDescription>
          <FieldError id={errorIdOf("reservation-table")} errors={form.errors("table")} />
        </Field>
        <Field data-invalid={form.invalid("memo")}>
          <FieldLabel htmlFor="reservation-memo">메모 (선택)</FieldLabel>
          <Textarea
            id="reservation-memo"
            name="memo"
            rows={2}
            defaultValue={form.text("memo")}
            {...fieldA11y("reservation-memo", form.invalid("memo"))}
          />
          <FieldError id={errorIdOf("reservation-memo")} errors={form.errors("memo")} />
        </Field>
      </FieldGroup>
      <DialogFormFooter submitLabel={reservation ? "저장" : "등록"} pending={form.pending} />
    </form>
  );
}
