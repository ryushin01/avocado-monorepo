import { CalendarDays, Clock, Timer, Users } from "lucide-react";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avocado/ui/components/card";
import { Skeleton } from "@avocado/ui/components/skeleton";

import { PageHeading } from "@/components/layout/page-heading";
import { ListEmpty } from "@/components/list/list-empty";
import { CafeComparisonTable } from "@/components/stats/cafe-comparison-table";
import { formatShortDate } from "@/components/stats/format";
import { KpiTile } from "@/components/stats/kpi-tile";
import { ALL_CAFES, StatsFilters } from "@/components/stats/stats-filters";
import { TrendChart } from "@/components/stats/trend-chart";
import { TurnoverTable } from "@/components/stats/turnover-table";
import { UsageHeatmap } from "@/components/stats/usage-heatmap";
import { getCurrentUser } from "@/lib/auth/current-user";
import { visibleCafes } from "@/lib/auth/permissions";
import { listCafes } from "@/lib/cafes/data";
import { firstParam } from "@/lib/games/schema";
import { toKstDate } from "@/lib/plays/time";
import { getStats } from "@/lib/stats/data";
import { parseStatPeriod } from "@/lib/stats/schema";

const TURNOVER_ROWS = 10;

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <StatsContent searchParams={searchParams} />
    </Suspense>
  );
}

function StatsSkeleton() {
  return (
    <>
      <PageHeading icon="stats" title="통계" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </>
  );
}

async function StatsContent({ searchParams }: Pick<PageProps<"/stats">, "searchParams">) {
  const [params, user, cafes] = await Promise.all([searchParams, getCurrentUser(), listCafes()]);
  const allowed = visibleCafes(user, cafes);
  if (allowed.length === 0) {
    return (
      <>
        <PageHeading icon="stats" title="통계" />
        <ListEmpty title="볼 수 있는 매장이 없습니다" description="소속 매장이 없거나 폐점했습니다. 관리자에게 문의해주세요." />
      </>
    );
  }

  const isAdmin = user.role === "admin";
  // 관리자는 전체 또는 매장 하나, 스태프는 요청과 관계없이 소속 매장
  const requested = firstParam(params.cafe);
  const picked = isAdmin ? allowed.find((c) => c.id === requested) : allowed[0];
  const scope = picked ? [picked] : allowed;
  const period = parseStatPeriod(params);
  const stats = await getStats(
    scope.map((c) => c.id),
    period,
  );

  const lastDay = toKstDate(Date.parse(stats.current.to) - 1);
  const firstDay = toKstDate(Date.parse(stats.current.from));
  const comparedTo = `그 전 ${period}일`;
  const turnoverMax = stats.turnover[0]?.playsPerBox ?? 0;
  const least = [...stats.turnover].reverse().slice(0, TURNOVER_ROWS);

  return (
    <>
      <PageHeading
        icon="stats"
        title="통계"
        description={`${picked?.name ?? (isAdmin ? "전체 매장" : scope[0].name)} · ${formatShortDate(firstDay)} ~ ${formatShortDate(lastDay)} (어제까지 ${period}일)을 그 전 ${period}일과 비교합니다.`}
      />
      <StatsFilters
        period={period}
        cafe={picked && isAdmin ? picked.id : ALL_CAFES}
        cafes={isAdmin ? allowed.map((c) => ({ value: c.id, label: c.name })) : undefined}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="이용 횟수"
          icon={Timer}
          value={stats.kpis.plays.current}
          previous={stats.kpis.plays.previous}
          unit="회"
          upIsGood
          comparedTo={comparedTo}
          trend={{
            current: stats.daily.map((d) => d.current),
            previous: stats.daily.map((d) => d.previous),
          }}
        />
        <KpiTile
          label="하루 평균 이용"
          icon={CalendarDays}
          value={stats.kpis.dailyAverage.current}
          previous={stats.kpis.dailyAverage.previous}
          unit="회"
          upIsGood
          comparedTo={comparedTo}
        />
        <KpiTile
          label="평균 이용 시간"
          icon={Clock}
          value={stats.kpis.averageMinutes.current}
          previous={stats.kpis.averageMinutes.previous}
          unit="분"
          comparedTo={comparedTo}
        />
        <KpiTile
          label="평균 인원"
          icon={Users}
          value={stats.kpis.averagePlayers.current}
          previous={stats.kpis.averagePlayers.previous}
          unit="명"
          comparedTo={comparedTo}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>일별 이용 추이</CardTitle>
          <CardDescription>
            날마다 이용을 시작한 횟수입니다. 점선은 그 전 {period}일의 같은 순서 날입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={stats.daily} period={period} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>요일·시간대별 이용</CardTitle>
          <CardDescription>
            언제 손님이 몰리는지 보여줍니다(한국 시간, 이용 시작 기준). 직원 배치에 참고하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsageHeatmap {...stats.heatmap} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>많이 이용된 게임</CardTitle>
            <CardDescription>
              보유 박스 하나가 기간 동안 이용된 횟수(폐기 제외)입니다. 박스를 늘릴 후보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TurnoverTable
              rows={stats.turnover.slice(0, TURNOVER_ROWS)}
              max={turnoverMax}
              caption="박스당 이용이 많은 게임"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>거의 이용되지 않은 게임</CardTitle>
            <CardDescription>
              박스당 이용이 적은 순입니다. 진열 위치를 바꾸거나 다른 매장으로 옮길 후보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TurnoverTable rows={least} max={turnoverMax} caption="박스당 이용이 적은 게임" />
          </CardContent>
        </Card>
      </div>

      {isAdmin && !picked && (
        <Card>
          <CardHeader>
            <CardTitle>매장별 비교</CardTitle>
            <CardDescription>
              매장 이름을 누르면 그 매장만 봅니다. 추이선은 모든 매장이 같은 눈금을 씁니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CafeComparisonTable cafes={stats.cafes} period={period} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
