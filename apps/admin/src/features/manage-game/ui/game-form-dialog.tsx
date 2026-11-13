"use client";

import type { ReactElement } from "react";

import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { useDialogForm } from "@/shared/lib/use-dialog-form";
import { Checkbox } from "@avocado/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avocado/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avocado/ui/components/select";
import type { FormState } from "@/shared/lib/form";
import {
  GAME_CATEGORIES,
  GAME_CATEGORY_LABELS,
  GAME_DIFFICULTIES,
  GAME_DIFFICULTY_LABELS,
  type BoardGame,
} from "@/entities/game";
import { FormTextField } from "@/shared/ui/form-text-field";
import { DialogFormFooter } from "@/shared/ui/dialog-form-footer";
import { errorIdOf, fieldA11y } from "@/shared/lib/field-a11y";

const DIFFICULTY_ITEMS = GAME_DIFFICULTIES.map((d) => ({
  value: d,
  label: GAME_DIFFICULTY_LABELS[d],
}));

type FormValues = Record<string, string | string[]>;

const BLANK: FormValues = {
  name: "",
  englishName: "",
  imageUrl: "",
  categories: [],
  difficulty: "normal",
  minPlayers: "2",
  maxPlayers: "4",
  playTimeMin: "30",
  playTimeMax: "60",
};

function toFormValues(game?: BoardGame): FormValues {
  if (!game) return BLANK;
  return {
    name: game.name,
    englishName: game.englishName ?? "",
    imageUrl: game.imageUrl ?? "",
    categories: game.categories,
    difficulty: game.difficulty,
    minPlayers: String(game.minPlayers),
    maxPlayers: String(game.maxPlayers),
    playTimeMin: String(game.playTimeMin),
    playTimeMax: String(game.playTimeMax),
  };
}

export function GameFormDialog({
  title,
  description,
  submitLabel,
  game,
  action,
  open,
  onOpenChange,
  trigger,
}: {
  title: string;
  description: string;
  submitLabel: string;
  /** 수정할 게임. 없으면 빈 폼(등록) */
  game?: BoardGame;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
}) {
  const form = useDialogForm(action, {
    defaults: toFormValues(game),
    onSuccess: () => onOpenChange(false),
  });
  const { text, list, invalid } = form;
  const fieldError = form.errors;

  const textField = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <FormTextField formState={form} idPrefix="game" name={name} label={label} {...props} />
  );

  const numberField = (name: string, label: string) =>
    textField(name, label, { type: "number", inputMode: "numeric", min: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form key={form.formKey} action={form.formAction} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <FormErrorAlert message={form.formError} />

            {textField("name", "게임 이름")}
            {textField("englishName", "영문 이름 (선택)")}
            {textField("imageUrl", "이미지 주소 (선택)", {
              type: "url",
              placeholder: "https://",
            })}

            <FieldSet data-invalid={invalid("categories")}>
              <FieldLegend variant="label">카테고리</FieldLegend>
              <div className="grid grid-cols-2 gap-3">
                {GAME_CATEGORIES.map((category) => (
                  <Field key={category} orientation="horizontal">
                    <Checkbox
                      id={`game-category-${category}`}
                      name="categories"
                      value={category}
                      defaultChecked={list("categories").includes(category)}
                      {...fieldA11y("game-categories", invalid("categories"))}
                    />
                    <FieldLabel
                      htmlFor={`game-category-${category}`}
                      className="font-normal"
                    >
                      {GAME_CATEGORY_LABELS[category]}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
              <FieldError id={errorIdOf("game-categories")} errors={fieldError("categories")} />
            </FieldSet>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={invalid("difficulty")} className="col-span-2">
                <FieldLabel htmlFor="game-difficulty">난이도</FieldLabel>
                <Select
                  name="difficulty"
                  items={DIFFICULTY_ITEMS}
                  defaultValue={text("difficulty") || "normal"}
                >
                  <SelectTrigger
                    id="game-difficulty"
                    className="w-full"
                    {...fieldA11y("game-difficulty", invalid("difficulty"))}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id={errorIdOf("game-difficulty")} errors={fieldError("difficulty")} />
              </Field>
              {numberField("minPlayers", "최소 인원")}
              {numberField("maxPlayers", "최대 인원")}
              {numberField("playTimeMin", "최소 플레이 시간(분)")}
              {numberField("playTimeMax", "최대 플레이 시간(분)")}
            </div>
          </FieldGroup>

          <DialogFormFooter submitLabel={submitLabel} pending={form.pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
