import type { Cafe } from "./types";

// 가상의 프랜차이즈 매장. 주소·전화번호도 지어낸 값이다.
export const SEED_CAFES: Cafe[] = [
  { id: "c_gangnam", name: "강남점", region: "서울", address: "서울 강남구", phone: "02-0000-0001", openedAt: "2023-03-02", status: "open" },
  { id: "c_hongdae", name: "홍대점", region: "서울", address: "서울 마포구", phone: "02-0000-0002", openedAt: "2023-07-15", status: "open" },
  { id: "c_pangyo", name: "판교점", region: "경기", address: "경기 성남시 분당구", phone: "031-000-0003", openedAt: "2024-02-01", status: "open" },
  { id: "c_dunsan", name: "대전 둔산점", region: "대전", address: "대전 서구", phone: "042-000-0004", openedAt: "2024-09-10", status: "open" },
  { id: "c_seomyeon", name: "부산 서면점", region: "부산", address: "부산 부산진구", phone: "051-000-0005", openedAt: "2025-04-05", status: "open" },
];
