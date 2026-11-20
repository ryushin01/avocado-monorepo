import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "./combobox";
import { Field, FieldLabel } from "./field";

const GAMES = ["카탄", "스플렌더", "아그리콜라", "테라포밍 마스", "윙스팬", "도미니언"];

const meta = { title: "부품/Combobox", component: Combobox } satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 대여 시작처럼 긴 목록에서 이름으로 골라야 할 때 쓴다. */
function GameCombobox({ id, defaultOpen = false }: { id: string; defaultOpen?: boolean }) {
  return (
    <Field className="w-72">
      <FieldLabel htmlFor={id}>게임</FieldLabel>
      <Combobox items={GAMES} defaultOpen={defaultOpen}>
        <ComboboxInput id={id} placeholder="게임 이름 검색" className="w-full" />
        <ComboboxContent>
          <ComboboxEmpty>찾는 게임이 없습니다.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

export const Default: Story = { render: () => <GameCombobox id="combobox-game" /> };

/** 연 상태(접근성 검사용, 문서 페이지에서는 뺌) */
export const Open: Story = { tags: ["!autodocs"], render: () => <GameCombobox id="combobox-game-open" defaultOpen /> };
