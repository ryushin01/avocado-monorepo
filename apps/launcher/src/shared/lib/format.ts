/** 한국 시각 "오후 7:30" */
export const formatKstTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(
    new Date(iso),
  );
