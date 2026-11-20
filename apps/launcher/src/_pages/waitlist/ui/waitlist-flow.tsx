"use client";

import { Loader2, Ticket as TicketIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import type { KioskWaitlistEntry } from "@avocado/domain/kiosk";
import { Button } from "@avocado/ui/components/button";
import { Card, CardContent } from "@avocado/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@avocado/ui/components/field";
import { Input } from "@avocado/ui/components/input";
import { errorIdOf, fieldA11y } from "@avocado/ui/lib/field-a11y";

import {
  joinWaitlistAction,
  type JoinState,
  lookupWaitlistAction,
} from "@/shared/api";

import { AlertMessage } from "@/shared/ui/alert-message";
import { IdleReturn } from "@/shared/ui/idle-return";
import { Keypad } from "@/shared/ui/keypad";
import { PartySizeStepper } from "@/shared/ui/party-size-stepper";

type Mode = "choose" | "join" | "check";

/** 대기 등록 폼의 글자 칸 (오류가 있으면 이 순서대로 첫 칸에 초점을 둔다) */
const FIELDS = ["name", "phone"] as const;
const fieldId = (name: string) => `wait-${name}`;
const SUBMIT_ID = "wait-submit";
const PARTY_LABEL_ID = "wait-party-label";
/** 손님 정보(가린 이름·대기 번호)가 보이는 결과 화면에서 경고를 띄우기까지의 시간. 다음 손님이 보지 않게 짧게 둔다. */
const RESULT_SECONDS = 30;

/** 대기 번호와 앞에 남은 팀 수 (등록 직후와 '내 순서 확인' 공통) */
function WaitTicket({ entry }: { entry: KioskWaitlistEntry }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-muted-foreground">{entry.maskedName}님 · {entry.partySize}명</p>
        <p className="text-6xl font-bold tabular-nums">{entry.number}번</p>
        <p className="text-xl">
          {entry.status === "called"
            ? "지금 호출됐습니다. 카운터로 와주세요."
            : entry.ahead === 0
              ? "다음 순서입니다."
              : `앞에 ${entry.ahead}팀이 기다리고 있습니다.`}
        </p>
      </CardContent>
    </Card>
  );
}

/** 한 손님의 흐름이 끝나면 key를 바꿔 처음 상태로 다시 그린다(등록 결과도 지워짐). */
export function WaitlistFlow() {
  const [session, setSession] = useState(0);
  return <WaitlistSession key={session} onRestart={() => setSession((n) => n + 1)} />;
}

function WaitlistSession({ onRestart }: { onRestart: () => void }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [state, joinAction, joining] = useActionState<JoinState, FormData>(joinWaitlistAction, { status: "idle" });
  const [found, setFound] = useState<KioskWaitlistEntry[] | null>(null);
  const [message, setMessage] = useState<string>();
  const [checking, startChecking] = useTransition();

  const check = (phone4: string) =>
    startChecking(async () => {
      const result = await lookupWaitlistAction(phone4);
      if (!result.ok) return setMessage("순서를 불러오지 못했습니다. 직원에게 문의해주세요.");
      setMessage(undefined);
      setFound(result.data.mine);
    });

  const reset = onRestart;
  const router = useRouter();

  // 등록하면 위쪽 '지금 N팀이 기다리고 있습니다'도 새 숫자로 다시 그린다.
  // 실패하면 다시 그린 폼에서 첫 오류 칸으로 초점을 옮겨, 무엇을 고칠지 바로 듣고 고칠 수 있게 한다.
  useEffect(() => {
    if (state.status === "done") router.refresh();
    if (state.status === "error") {
      const invalid = FIELDS.find((name) => state.fieldErrors[name]?.length);
      document.getElementById(invalid ? fieldId(invalid) : SUBMIT_ID)?.focus();
    }
  }, [state, router]);

  if (mode === "join" && state.status === "done") {
    return (
      <div className="flex flex-col gap-4">
        <IdleReturn seconds={RESULT_SECONDS} />
        <h2 className="text-2xl font-bold">대기 등록을 마쳤습니다</h2>
        <WaitTicket entry={state.entry} />
        <p className="text-muted-foreground">순서가 되면 직원이 이름을 불러드립니다. 번호를 기억해주세요.</p>
        <Button size="lg" className="h-12 self-start px-6 text-base" onClick={reset}>
          처음으로
        </Button>
      </div>
    );
  }

  if (mode === "join") {
    const values = state.status === "error" ? state.values : undefined;
    const errors = state.status === "error" ? state.fieldErrors : {};
    const err = (name: string) => errors[name]?.map((m) => ({ message: m }));
    const invalid = (name: string) => Boolean(errors[name]?.length);
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">대기 등록</h2>
        {/* 다시 그리는 폼 밖에 두어, 처음부터 있던 알림 영역의 내용만 바뀌게 한다. */}
        <AlertMessage message={state.status === "error" ? state.message : undefined} />
        <form
          // 실패하면 입력값(defaultValue)을 확실히 되살리도록 다시 그린다.
          key={state.status === "error" ? `${state.message}:${JSON.stringify(state.values)}` : "new"}
          action={joinAction}
          noValidate
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Field>
              <FieldLabel id={PARTY_LABEL_ID} className="text-base">인원</FieldLabel>
              <PartySizeStepper
                name="partySize"
                labelledBy={PARTY_LABEL_ID}
                defaultValue={values ? Number(values.partySize) : 2}
              />
            </Field>
            <Field data-invalid={invalid("name")}>
              <FieldLabel htmlFor={fieldId("name")} className="text-base">이름</FieldLabel>
              <Input
                id={fieldId("name")}
                name="name"
                autoComplete="off"
                defaultValue={values?.name}
                className="h-12 text-lg"
                {...fieldA11y(fieldId("name"), invalid("name"))}
              />
              <FieldError id={errorIdOf(fieldId("name"))} errors={err("name")} />
            </Field>
            <Field data-invalid={invalid("phone")}>
              <FieldLabel htmlFor={fieldId("phone")} className="text-base">휴대전화</FieldLabel>
              <Input
                id={fieldId("phone")}
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="010-1234-5678"
                defaultValue={values?.phone}
                className="h-12 text-lg"
                {...fieldA11y(fieldId("phone"), invalid("phone"))}
              />
              <FieldError id={errorIdOf(fieldId("phone"))} errors={err("phone")} />
            </Field>
          </FieldGroup>
          <p className="text-sm text-muted-foreground">
            전화번호는 순서 확인과 호출에만 쓰고, 화면에는 보여주지 않습니다.
          </p>
          <div className="flex gap-3">
            {/* 보내는 동안(끊긴 동안 미뤄 둔 때 포함)은 막는다. 누른 등록은 연결되면 이어서 보내고 번호표를 보여 준다. */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base"
              onClick={reset}
              disabled={joining}
            >
              뒤로
            </Button>
            <Button id={SUBMIT_ID} type="submit" size="lg" className="h-12 flex-1 text-base" disabled={joining}>
              {joining && <Loader2 className="animate-spin" />}
              대기 등록
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === "check") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">내 순서 확인</h2>
        {found !== null && <IdleReturn seconds={RESULT_SECONDS} />}
        <AlertMessage message={message} />
        {found === null ? (
          <Keypad label="등록하신 휴대전화 번호 뒷자리 4자리를 눌러주세요" disabled={checking} onComplete={check} />
        ) : found.length === 0 ? (
          <p className="rounded-xl border bg-background p-8 text-center text-lg text-muted-foreground">
            대기 중인 번호를 찾을 수 없습니다. 이미 입장했거나 번호가 다를 수 있습니다.
          </p>
        ) : (
          found.map((entry) => <WaitTicket key={entry.id} entry={entry} />)
        )}
        <Button variant="outline" size="lg" className="h-12 self-start px-6 text-base" onClick={reset}>
          처음으로
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Button className="h-28 flex-col gap-2 text-xl" onClick={() => setMode("join")}>
        <TicketIcon className="size-8" />
        대기 등록하기
      </Button>
      <Button variant="outline" className="h-28 flex-col gap-2 text-xl" onClick={() => setMode("check")}>
        내 순서 확인
      </Button>
    </div>
  );
}
