import { StaffRowActions } from "@/components/staff/staff-row-actions";
import type { CafeOption } from "@/components/staff/staff-form-dialog";
import { Badge } from "@avocado/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@avocado/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import { ROLE_LABELS, type User } from "@/lib/auth/roles";
import type { Cafe } from "@/lib/cafes/types";

function StatusBadge({ user }: { user: User }) {
  return (
    <Badge variant={user.active ? "default" : "outline"}>
      {user.active ? "재직" : "퇴사"}
    </Badge>
  );
}

function Name({ user, isSelf }: { user: User; isSelf: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-medium">
      {user.name}
      {isSelf && <Badge variant="secondary">나</Badge>}
    </span>
  );
}

/** 데스크톱은 표, 모바일은 카드 목록 */
export function StaffList({
  users,
  cafes,
  cafeOptions,
  currentUserId,
}: {
  users: User[];
  /** 소속 매장 이름 표시용 (폐점 포함) */
  cafes: Cafe[];
  /** 소속 매장으로 고를 수 있는 매장 */
  cafeOptions: CafeOption[];
  currentUserId: string;
}) {
  const cafeById = new Map(cafes.map((c) => [c.id, c]));
  const cafeLabel = (user: User) => {
    if (user.role === "admin") return "전체 매장";
    const cafe = user.cafeId ? cafeById.get(user.cafeId) : undefined;
    if (!cafe) return "–";
    return cafe.status === "closed" ? `${cafe.name} (폐점)` : cafe.name;
  };

  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>소속 매장</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">작업</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={user.active ? undefined : "text-muted-foreground"}>
                <TableCell>
                  <Name user={user} isSelf={user.id === currentUserId} />
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                <TableCell>{cafeLabel(user)}</TableCell>
                <TableCell>
                  <StatusBadge user={user} />
                </TableCell>
                <TableCell>
                  <StaffRowActions
                    user={user}
                    cafes={cafeOptions}
                    isSelf={user.id === currentUserId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ItemGroup aria-label="직원 목록" className="gap-2 md:hidden">
        {users.map((user) => (
          <Item key={user.id} variant="outline" data-testid="staff-item">
            <ItemContent className="min-w-0 gap-1">
              <ItemTitle className="flex-wrap">
                <Name user={user} isSelf={user.id === currentUserId} />
                <StatusBadge user={user} />
              </ItemTitle>
              <ItemDescription className="truncate">{user.email}</ItemDescription>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]} · {cafeLabel(user)}
              </p>
            </ItemContent>
            <ItemActions className="self-start">
              <StaffRowActions
                user={user}
                cafes={cafeOptions}
                isSelf={user.id === currentUserId}
              />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </>
  );
}
