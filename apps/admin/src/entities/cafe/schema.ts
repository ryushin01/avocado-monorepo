// 입력 검증(zod)은 서버에서 한다. zod가 브라우저 번들에 들어가지 않도록 index.ts와 나눈다.
export {
  cafeInputSchema,
} from "./model/schema";
