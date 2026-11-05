/** 새 행의 id. 시드 데이터는 읽기 쉬운 id(c_gangnam, g_1)를 쓰고, 새로 만드는 행은 무작위 id를 쓴다. */
export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
