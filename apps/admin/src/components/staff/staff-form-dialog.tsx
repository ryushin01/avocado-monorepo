"use client";

import { Loader2 } from "lucide-react";
import { useState, type ReactElement } from "react";

import { FormErrorAlert } from "@/components/form/form-error-alert";
import { useDialogForm } from "@/components/form/use-dialog-form";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";
import { ROLE_LABELS, ROLES, type Role, type User } from "@/lib/auth/roles";
import type { FormState } from "@/lib/form";

export type CafeOption = { value: string; label: string };

const ROLE_ITEMS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

function toFormValues(user?: User) {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "staff",
    cafeId: user?.cafeId ?? "",
  };
}

export function StaffFormDialog({
  title,
  description,
  submitLabel,
  user,
  cafes,
  lockRole = false,
  action,
  open,
  onOpenChange,
  trigger,
}: {
  title: string;
  description: string;
  submitLabel: string;
  /** 수정할 직원. 없으면 빈 폼(등록) */
  user?: User;
  /** 소속 매장으로 고를 수 있는 매장 (운영 중) */
  cafes: CafeOption[];
  /** 자기 자신을 수정할 때는 역할을 바꿀 수 없다. */
  lockRole?: boolean;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
}) {
  const form = useDialogForm(action, {
    defaults: toFormValues(user),
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {/* form이 다시 마운트될 때(제출 후) 역할 선택도 입력값으로 되돌린다. */}
          <StaffFields form={form} cafes={cafes} lockRole={lockRole} isNew={!user} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              취소
            </DialogClose>
            <Button type="submit" disabled={form.pending}>
              {form.pending && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffFields({
  form,
  cafes,
  lockRole,
  isNew,
}: {
  form: ReturnType<typeof useDialogForm>;
  cafes: CafeOption[];
  lockRole: boolean;
  /** 등록이면 초기 비밀번호가 필수 */
  isNew: boolean;
}) {
  const [role, setRole] = useState<Role>(form.text("role") === "admin" ? "admin" : "staff");

  const textField = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={form.invalid(name)}>
      <FieldLabel htmlFor={`staff-${name}`}>{label}</FieldLabel>
      <Input
        id={`staff-${name}`}
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
    <FieldGroup className="py-4">
      <FormErrorAlert message={form.formError} />
      {textField("name", "이름")}
      {textField("email", "이메일", { type: "email", inputMode: "email" })}
      <Field data-invalid={form.invalid("password")}>
        <FieldLabel htmlFor="staff-password">{isNew ? "초기 비밀번호" : "임시 비밀번호 (재설정할 때만)"}</FieldLabel>
        {/* 비밀번호는 실패해도 되돌려 채우지 않는다. */}
        <Input
          id="staff-password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={form.invalid("password")}
        />
        <FieldDescription>
          {isNew
            ? "8자 이상. 직원에게 따로 알려주세요. 직원은 처음 로그인할 때 본인 비밀번호로 바꿉니다."
            : "비밀번호를 잊은 직원에게 임시 비밀번호를 정해 줍니다. 직원은 다음 로그인 때 바꿔야 합니다. 비워 두면 그대로 둡니다."}
        </FieldDescription>
        <FieldError errors={form.errors("password")} />
      </Field>
      <Field data-invalid={form.invalid("role")}>
        <FieldLabel htmlFor="staff-role">역할</FieldLabel>
        <Select
          name="role"
          items={ROLE_ITEMS}
          value={role}
          onValueChange={(v) => setRole(v === "admin" ? "admin" : "staff")}
          disabled={lockRole}
        >
          <SelectTrigger id="staff-role" className="w-full" aria-invalid={form.invalid("role")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* 비활성 Select는 값을 보내지 않으므로 숨은 값으로 보낸다. */}
        {lockRole && <input type="hidden" name="role" value={role} />}
        <FieldDescription>
          {lockRole
            ? "자기 자신의 역할은 바꿀 수 없습니다."
            : "관리자는 모든 매장을, 스태프는 소속 매장만 관리합니다."}
        </FieldDescription>
        <FieldError errors={form.errors("role")} />
      </Field>
      {role === "staff" && (
        <Field data-invalid={form.invalid("cafeId")}>
          <FieldLabel htmlFor="staff-cafe">소속 매장</FieldLabel>
          <Select name="cafeId" items={cafes} defaultValue={form.text("cafeId") || null}>
            <SelectTrigger
              id="staff-cafe"
              className="w-full"
              aria-invalid={form.invalid("cafeId")}
            >
              <SelectValue placeholder="매장 선택" />
            </SelectTrigger>
            <SelectContent>
              {cafes.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={form.errors("cafeId")} />
        </Field>
      )}
    </FieldGroup>
  );
}
