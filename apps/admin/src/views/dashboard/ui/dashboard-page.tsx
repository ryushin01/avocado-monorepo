import { Boxes, CalendarCheck, Dices, Store, Timer, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
  CafeStatusChart,
  CafeSummaryTable,
  CategoryChart,
  DistributionChart,
  MaintenanceList,
  PopularGamesChart,
  StatTile,
} from "@/widgets/dashboard";
import { PageHeading } from "@/widgets/app-shell";
import { buttonVariants } from "@avocado/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";
import { Skeleton } from "@avocado/ui/components/skeleton";
import { getCurrentUser } from "@/server/auth/current-user";
import { visibleCafes } from "@/entities/user";
import { listCafes } from "@/server/cafes/data";
import { summarizeInventory } from "@/server/inventory/data";
import { buildListHref } from "@/shared/lib/list";
import { getPopularityRanking, summarizePlayUsage } from "@/server/plays/data";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <PageHeading icon="dashboard" title="대시보드" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </>
  );
}

async function DashboardContent() {
  const [user, cafes] = await Promise.all([getCurrentUser(), listCafes()]);
  const scope = visibleCafes(user, cafes);
  const cafeIds = scope.map((c) => c.id);
  const [summary, week, month, usage] = await Promise.all([
    summarizeInventory(cafeIds),
    getPopularityRanking(cafeIds, "week"),
    getPopularityRanking(cafeIds, "month"),
    summarizePlayUsage(cafeIds),
  ]);
  const isAdmin = user.role === "admin";
  const { totals } = summary;
  // 스태프는 소속 매장 하나만 본다.
  const myCafe = isAdmin ? undefined : scope[0];

  return (
    <>
      <PageHeading
        icon="dashboard"
        title="대시보드"
        description={
          isAdmin
            ? `전체 ${totals.cafeCount}개 매장의 재고 현황입니다.`
            : `${myCafe?.name ?? "소속 매장"}의 재고 현황입니다.`
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {isAdmin && (
          <StatTile label="운영 매장" value={totals.cafeCount} unit="개" icon={Store} />
        )}
        <StatTile
          label="보유 게임"
          value={totals.gameCount}
          unit="종"
          icon={Dices}
          hint={isAdmin ? "매장이 달라도 같은 게임은 한 번만 셉니다" : undefined}
        />
        <StatTile
          label="보유 박스"
          value={totals.boxCount}
          unit="개"
          icon={Boxes}
          hint="폐기 제외"
        />
        <StatTile
          label="점검 중"
          value={totals.maintenanceCount}
          unit="종"
          icon={Wrench}
        />
        {!isAdmin && (
          <StatTile label="폐기" value={totals.retiredCount} unit="종" icon={Trash2} />
        )}
        <StatTile label="지금 이용 중" value={usage.totals.inUse} unit="건" icon={Timer} />
        <StatTile
          label="오늘 이용"
          value={usage.totals.today}
          unit="회"
          icon={CalendarCheck}
          hint="오늘 0시부터 이용을 시작한 횟수"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>인기 게임 순위</CardTitle>
            <CardDescription>
              {isAdmin ? "전체 매장" : (myCafe?.name ?? "소속 매장")}에서 많이 이용된
              게임 1~10위
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopularGamesChart rankings={{ week, month }} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>최근 점검 중</CardTitle>
            <CardDescription>최근에 점검 중으로 바뀐 게임</CardDescription>
            {myCafe && totals.maintenanceCount > 0 && (
              <CardAction>
                <Link
                  href={buildListHref("/inventory", { status: "maintenance" })}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  전체 보기
                </Link>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <MaintenanceList entries={summary.maintenance} showCafe={isAdmin} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>유형별 보유 게임</CardTitle>
            <CardDescription>
              폐기 제외. 여러 유형에 속한 게임은 각 유형에 모두 셉니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryChart data={summary.categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>인원수별 플레이 가능 게임</CardTitle>
            <CardDescription>
              폐기 제외. 손님 수에 맞는 게임이 몇 종인지 보여줍니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart
              data={summary.players}
              caption="인원수별 플레이 가능 게임"
              bucketHeader="인원"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>플레이 시간별 게임</CardTitle>
            <CardDescription>폐기 제외. 최소 플레이 시간 기준입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart
              data={summary.playTime}
              caption="플레이 시간별 게임"
              bucketHeader="최소 플레이 시간"
            />
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>매장별 재고 상태</CardTitle>
            <CardDescription>
              매장마다 보유 게임이 어떤 상태인지 비교합니다. 정확한 수치는 아래 표에 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CafeStatusChart cafes={summary.cafes} />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>매장별 현황</CardTitle>
            <CardDescription>
              매장 이름을 누르면 재고 관리로, 이용 중 수를 누르면 이용 기록으로 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CafeSummaryTable cafes={summary.cafes} usage={usage.cafes} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
