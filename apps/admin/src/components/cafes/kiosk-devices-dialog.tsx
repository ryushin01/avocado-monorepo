"use client";

import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@avocado/ui/components/alert";
import { Badge } from "@avocado/ui/components/badge";
import { Button } from "@avocado/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avocado/ui/components/dialog";
import { Field, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@avocado/ui/components/item";

import {
  issueKioskTokenAction,
  listKioskDevicesAction,
  revokeKioskDeviceAction,
} from "@/app/(backoffice)/cafes/actions";
import type { KioskDevice } from "@/lib/kiosk/devices";
import { formatDateTime } from "@/lib/plays/format";

/**
 * 매장 키오스크(런처) 기기 토큰. 기기마다 토큰을 따로 발급하고, 잃어버린 기기는 폐기한다.
 * 토큰 원문은 발급 직후 이 창에서 한 번만 보여준다.
 */
export function KioskDevicesDialog({
  cafeId,
  cafeName,
  open,
  onOpenChange,
}: {
  cafeId: string;
  cafeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [devices, setDevices] = useState<KioskDevice[] | null>(null);
  const [issued, setIssued] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const reload = () => startTransition(async () => setDevices(await listKioskDevicesAction(cafeId)));

  // 부모가 열 때마다 이 창을 새로 그리므로(key), 보여줬던 토큰은 다시 열면 사라진다.
  useEffect(() => {
    if (open) reload();
    // reload는 cafeId만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cafeId]);

  const issue = () =>
    startTransition(async () => {
      const result = await issueKioskTokenAction(cafeId, name);
      if (!result.ok) return void toast.error(result.message);
      setIssued({ name: result.device.name, token: result.token });
      setCopied(false);
      setName("");
      setDevices(await listKioskDevicesAction(cafeId));
    });

  const revoke = (device: KioskDevice) =>
    startTransition(async () => {
      const result = await revokeKioskDeviceAction(cafeId, device.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setDevices(await listKioskDevicesAction(cafeId));
    });

  const copy = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.token);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>키오스크 토큰 · {cafeName}</DialogTitle>
          <DialogDescription>
            매장 태블릿(런처)마다 토큰을 발급해 런처의 KIOSK_API_TOKEN에 넣습니다. 토큰은 이 매장에서만 쓸 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {issued && (
          <Alert>
            <KeyRound />
            <AlertTitle>&lsquo;{issued.name}&rsquo; 토큰 (지금만 볼 수 있습니다)</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <code className="break-all rounded-md bg-muted px-2 py-1 text-xs" data-testid="issued-token">
                {issued.token}
              </code>
              <Button size="sm" variant="outline" className="self-start" onClick={copy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "복사했습니다" : "복사"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="kiosk-device-name">새 기기 이름</FieldLabel>
            <Input
              id="kiosk-device-name"
              value={name}
              placeholder="예: 입구 태블릿"
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Button onClick={issue} disabled={pending || name.trim() === ""}>
            {pending && <Loader2 className="animate-spin" />}
            발급
          </Button>
        </div>

        <ItemGroup aria-label="키오스크 기기" className="gap-2">
          {devices === null ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">발급한 토큰이 없습니다.</p>
          ) : (
            devices.map((d) => (
              <Item key={d.id} variant="outline" size="sm" data-testid="kiosk-device">
                <ItemContent className="min-w-0">
                  <ItemTitle className="flex-wrap">
                    {d.name}
                    {d.revokedAt ? <Badge variant="outline">폐기함</Badge> : <Badge>사용 중</Badge>}
                  </ItemTitle>
                  <ItemDescription className="tabular-nums">
                    {d.tokenPrefix} · {formatDateTime(d.createdAt)} 발급
                    {d.lastUsedAt ? ` · 마지막 접속 ${formatDateTime(d.lastUsedAt)}` : " · 아직 접속 없음"}
                  </ItemDescription>
                </ItemContent>
                {!d.revokedAt && (
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => revoke(d)}
                      aria-label={`${d.name} 토큰 폐기`}
                    >
                      <Trash2 />
                      폐기
                    </Button>
                  </ItemActions>
                )}
              </Item>
            ))
          )}
        </ItemGroup>
      </DialogContent>
    </Dialog>
  );
}
