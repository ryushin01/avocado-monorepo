import { z } from "zod";

import { TABLE_SEATS_MAX } from "./table";

/** 빈 문자열은 값 없음(undefined)으로 본다. */
const optionalText = (schema: z.ZodType<string>) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

export const cafeInputSchema = z.object({
  name: z
    .string({ error: "매장 이름을 입력해주세요." })
    .trim()
    .min(1, "매장 이름을 입력해주세요.")
    .max(30, "매장 이름은 30자 이하여야 합니다."),
  region: z
    .string({ error: "지역을 입력해주세요." })
    .trim()
    .min(1, "지역을 입력해주세요.")
    .max(20, "지역은 20자 이하여야 합니다."),
  address: optionalText(z.string().trim().max(100, "주소는 100자 이하여야 합니다.")),
  phone: optionalText(
    z
      .string()
      .trim()
      .regex(/^\d{2,4}-\d{3,4}-\d{4}$/, "전화번호는 02-1234-5678 형식으로 입력해주세요."),
  ),
  openedAt: z.iso.date({ error: "개점일을 입력해주세요." }),
});

export type CafeInput = z.infer<typeof cafeInputSchema>;

/** 테이블 추가 폼 */
export const cafeTableInputSchema = z.object({
  label: z
    .string({ error: "테이블 이름을 입력해주세요." })
    .trim()
    .min(1, "테이블 이름을 입력해주세요.")
    .max(12, "테이블 이름은 12자 이하여야 합니다."),
  seats: z.coerce
    .number({ error: "좌석 수를 입력해주세요." })
    .int("좌석 수는 정수여야 합니다.")
    .min(1, "좌석은 1석 이상이어야 합니다.")
    .max(TABLE_SEATS_MAX, `좌석은 ${TABLE_SEATS_MAX}석 이하여야 합니다.`),
});

export type CafeTableInput = z.infer<typeof cafeTableInputSchema>;
