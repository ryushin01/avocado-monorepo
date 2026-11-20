import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { descriptionIdOf } from "../lib/field-a11y";
import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from "./field";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const SLOTS = [
  { time: "17:30", available: true },
  { time: "18:00", available: false },
  { time: "18:30", available: true },
  { time: "19:00", available: true },
];

const meta = { title: "부품/RadioGroup", component: RadioGroup } satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 시각 고르기(홈페이지 온라인 예약). 방향키로 옮기고, 고를 수 없는 시각은 '마감'과 함께 읽힌다. */
export const TimeSlots: Story = {
  render: () => (
    <FieldSet className="w-96">
      <FieldLegend id="radio-time-legend">방문 시각</FieldLegend>
      <FieldDescription id={descriptionIdOf("radio-time")}>예약하면 2시간 동안 테이블 하나를 맡아 둡니다.</FieldDescription>
      <RadioGroup
        name="time"
        defaultValue="18:30"
        aria-labelledby="radio-time-legend"
        aria-describedby={descriptionIdOf("radio-time")}
        className="grid grid-cols-2 gap-2"
      >
        {SLOTS.map((slot) => {
          const id = `radio-time-${slot.time.replace(":", "")}`;
          return (
            <FieldLabel
              key={slot.time}
              htmlFor={id}
              className="flex min-h-11 items-center gap-2 rounded-lg border px-3 has-data-checked:border-primary has-data-disabled:text-muted-foreground"
            >
              <RadioGroupItem id={id} value={slot.time} disabled={!slot.available} />
              <span className="tabular-nums">{slot.time}</span>
              {!slot.available && <span className="text-xs">마감</span>}
            </FieldLabel>
          );
        })}
      </RadioGroup>
    </FieldSet>
  ),
};
