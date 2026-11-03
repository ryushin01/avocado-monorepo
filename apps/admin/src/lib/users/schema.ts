import { z } from "zod";

import { ROLES } from "@/lib/auth/roles";

export const userInputSchema = z
  .object({
    name: z
      .string({ error: "이름을 입력해주세요." })
      .trim()
      .min(1, "이름을 입력해주세요.")
      .max(30, "이름은 30자 이하여야 합니다."),
    // 앞뒤 공백을 지우고 소문자로 맞춘 뒤 형식을 검사한다.
    email: z
      .string({ error: "이메일을 입력해주세요." })
      .trim()
      .toLowerCase()
      .max(100, "이메일은 100자 이하여야 합니다.")
      .pipe(z.email({ error: "이메일 형식이 올바르지 않습니다." })),
    role: z.enum(ROLES, { error: "역할을 선택해주세요." }),
    cafeId: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  })
  // 관리자는 모든 매장을 관리하므로 소속 매장이 없다.
  .transform((v) => (v.role === "admin" ? { ...v, cafeId: undefined } : v))
  .refine((v) => v.role === "admin" || v.cafeId, {
    path: ["cafeId"],
    message: "스태프는 소속 매장을 선택해주세요.",
  });

export type UserInput = z.infer<typeof userInputSchema>;
