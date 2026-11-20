import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table";

const ROWS = [
  { id: "r1", time: "13:00", name: "김*수", people: 2, table: "A1", status: "확정" },
  { id: "r2", time: "18:30", name: "이*희", people: 4, table: "B1", status: "확정", online: true },
  { id: "r3", time: "19:00", name: "박*준", people: 6, table: "C1", status: "가예약" },
];

const meta = { title: "부품/Table", component: Table } satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 가로로 넘칠 때만 label을 이름으로 가진 스크롤 영역이 된다(키보드로 넘겨 볼 수 있음). */
export const Default: Story = {
  render: () => (
    <div className="w-[36rem] rounded-lg border">
      <Table label="예약 목록">
        <TableCaption>11월 21일 예약 3건</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>시각</TableHead>
            <TableHead>이름</TableHead>
            <TableHead className="text-right">인원</TableHead>
            <TableHead>테이블</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium tabular-nums">{r.time}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell className="text-right tabular-nums">{r.people}명</TableCell>
              <TableCell>{r.table}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant={r.status === "확정" ? "default" : "secondary"}>{r.status}</Badge>
                  {r.online && <Badge variant="outline">온라인</Badge>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
