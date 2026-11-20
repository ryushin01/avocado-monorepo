"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@avocado/ui/components/badge";
import { Button } from "@avocado/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avocado/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@avocado/ui/components/item";

import { addCafeTableAction, listCafeTablesAction, setCafeTableActiveAction } from "../api/actions";
import { TABLE_SEATS_MAX, type CafeTable } from "@/entities/cafe";
import { errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";

const LABEL_ID = "cafe-table-label";
const SEATS_ID = "cafe-table-seats";

/**
 * 매장 테이블. 예약은 테이블 하나를 2시간 쓰고, 자동 배정(온라인 예약·직원 등록)은 일행이 앉을 가장 작은 빈 테이블을 고른다.
 * 쓰지 않게 된 테이블은 지우지 않고 끈다(지난 예약이 그 테이블을 가리킬 수 있음).
 */
export function CafeTablesDialog({
  cafeId,
  cafeName,
  open,
  onOpenChange,
}: {
  cafeId: string;
  cafeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tables, setTables] = useState<CafeTable[] | null>(null);
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("4");
  const [error, setError] = useState<{ field: "label" | "seats"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const labelRef = useRef<HTMLInputElement>(null);
  const seatsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) startTransition(async () => setTables(await listCafeTablesAction(cafeId)));
  }, [open, cafeId]);

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await addCafeTableAction(cafeId, { label, seats });
      if (!result.ok) {
        if (!result.field) return void toast.error(result.message);
        setError({ field: result.field, message: result.message });
        // 고칠 칸으로 초점을 옮긴다(KWCAG 7.3.1).
        (result.field === "seats" ? seatsRef : labelRef).current?.focus();
        return;
      }
      toast.success(result.message);
      setError(null);
      setLabel("");
      setTables(await listCafeTablesAction(cafeId));
      labelRef.current?.focus();
    });
  };

  const toggle = (table: CafeTable) =>
    startTransition(async () => {
      const result = await setCafeTableActiveAction(cafeId, table.id, !table.active);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setTables(await listCafeTablesAction(cafeId));
    });

  const active = tables?.filter((t) => t.active) ?? [];
  const invalid = (field: "label" | "seats") => error?.field === field;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>테이블 · {cafeName}</DialogTitle>
          <DialogDescription>
            예약은 테이블 하나를 2시간 씁니다. 온라인 예약과 직원 등록의 자동 배정은 일행이 앉을 수 있는 가장 작은 빈
            테이블을 고릅니다. 쓰지 않는 테이블은 지우지 않고 꺼 둡니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} noValidate className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_6rem] items-start gap-2">
            <Field data-invalid={invalid("label")}>
              <FieldLabel htmlFor={LABEL_ID}>새 테이블 이름</FieldLabel>
              <Input
                ref={labelRef}
                id={LABEL_ID}
                value={label}
                placeholder="예: D1, 창가 2"
                autoComplete="off"
                maxLength={12}
                onChange={(e) => setLabel(e.target.value)}
                {...fieldA11y(LABEL_ID, invalid("label"))}
              />
              <FieldError id={errorIdOf(LABEL_ID)} errors={invalid("label") ? [{ message: error?.message }] : undefined} />
            </Field>
            <Field data-invalid={invalid("seats")}>
              <FieldLabel htmlFor={SEATS_ID}>좌석</FieldLabel>
              <Input
                ref={seatsRef}
                id={SEATS_ID}
                type="number"
                inputMode="numeric"
                min={1}
                max={TABLE_SEATS_MAX}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                {...fieldA11y(SEATS_ID, invalid("seats"))}
              />
              <FieldError id={errorIdOf(SEATS_ID)} errors={invalid("seats") ? [{ message: error?.message }] : undefined} />
            </Field>
          </div>
          <Button type="submit" className="self-end" disabled={pending || label.trim() === ""}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />}
            추가
          </Button>
        </form>

        {tables === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록한 테이블이 없습니다. 테이블이 없으면 예약을 자동 배정할 수 없습니다.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground tabular-nums">
              쓰는 테이블 {active.length}개 · 좌석 {active.reduce((sum, t) => sum + t.seats, 0)}석
            </p>
            <ItemGroup aria-label="테이블" className="gap-2">
              {tables.map((t) => (
                <Item key={t.id} variant="outline" size="sm" role="listitem" data-testid="cafe-table">
                  <ItemContent className="min-w-0">
                    <ItemTitle className="flex-wrap">
                      {t.label}
                      {!t.active && <Badge variant="outline">쓰지 않음</Badge>}
                    </ItemTitle>
                    <ItemDescription className="tabular-nums">{t.seats}석</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => toggle(t)}
                      // 접근 이름은 보이는 글자로 시작한다(음성 제어로 '쓰지 않기'라고 불러도 찾게).
                      aria-label={t.active ? `쓰지 않기: ${t.label} 테이블` : `다시 쓰기: ${t.label} 테이블`}
                    >
                      {t.active ? "쓰지 않기" : "다시 쓰기"}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
