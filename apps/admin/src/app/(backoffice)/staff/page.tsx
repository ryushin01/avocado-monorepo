import { Suspense } from "react";

import { PageHeading } from "@/components/layout/page-heading";
import { ListSkeleton } from "@/components/list/list-empty";
import { CreateStaffDialog } from "@/components/staff/create-staff-dialog";
import { StaffList } from "@/components/staff/staff-list";
import { requireRole } from "@/lib/auth/guard";
import { listCafes } from "@/lib/cafes/data";
import { listUsers } from "@/lib/users/data";

export default function StaffPage() {
  // 사용자(쿠키)를 읽어 권한을 확인하므로 Suspense 안에서 렌더링한다.
  return (
    <Suspense
      fallback={
        <>
          <PageHeading icon="staff" title="직원 관리" />
          <ListSkeleton />
        </>
      }
    >
      <StaffContent />
    </Suspense>
  );
}

async function StaffContent() {
  const me = await requireRole(["admin"]);
  const [users, cafes] = await Promise.all([listUsers(), listCafes()]);
  const cafeOptions = cafes
    .filter((c) => c.status === "open")
    .map((c) => ({ value: c.id, label: c.name }));
  const activeCount = users.filter((u) => u.active).length;

  return (
    <>
      <PageHeading
        icon="staff"
        title="직원 관리"
        description="직원을 등록하고 역할과 소속 매장을 정합니다. 퇴사 처리한 직원은 계정 전환 목록에서 빠집니다."
        actions={<CreateStaffDialog cafes={cafeOptions} />}
      />
      <p className="text-sm text-muted-foreground">
        재직 {activeCount}명 · 퇴사 {users.length - activeCount}명
      </p>
      <StaffList
        users={users}
        cafes={cafes}
        cafeOptions={cafeOptions}
        currentUserId={me.id}
      />
    </>
  );
}
