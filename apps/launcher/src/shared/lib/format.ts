import { tz } from "@date-fns/tz";
import { format } from "date-fns/format";
import { ko } from "date-fns/locale/ko";

const kst = { in: tz("Asia/Seoul"), locale: ko };

/** 한국 시각 "오후 7:30" */
export const formatKstTime = (iso: string) => format(iso, "a h:mm", kst);
