import { z } from "zod";

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
