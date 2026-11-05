import { CatalogRowActions } from "@/features/manage-game";
import {
  formatPlayTime,
  formatPlayers,
  GameCategoryBadges,
  GameNameCell,
} from "@/entities/game/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avocado/ui/components/table";
import { GAME_DIFFICULTY_LABELS, type CatalogEntry } from "@/entities/game";

export function formatHolding({ holding }: CatalogEntry) {
  return holding.cafeCount === 0
    ? "보유 매장 없음"
    : `${holding.cafeCount}개 매장 · ${holding.quantity}개`;
}

export function CatalogTable({
  games,
  canEdit,
}: {
  games: CatalogEntry[];
  canEdit: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>인원</TableHead>
            <TableHead>플레이 시간</TableHead>
            <TableHead>난이도</TableHead>
            <TableHead>보유 현황</TableHead>
            {canEdit && (
              <TableHead className="w-12">
                <span className="sr-only">작업</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => (
            <TableRow key={game.id}>
              <TableCell>
                <GameNameCell game={game} />
              </TableCell>
              <TableCell>
                <GameCategoryBadges game={game} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatPlayers(game)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatPlayTime(game)}
              </TableCell>
              <TableCell>{GAME_DIFFICULTY_LABELS[game.difficulty]}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatHolding(game)}
              </TableCell>
              {canEdit && (
                <TableCell>
                  <CatalogRowActions game={game} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
