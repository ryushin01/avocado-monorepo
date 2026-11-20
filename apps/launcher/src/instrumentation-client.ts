import { initMonitoring } from "@/shared/lib/monitoring";

// 오류 모니터링은 화면을 그리는 데 필요 없으므로 DSN이 있을 때만 첫 화면 뒤에 따로 받는다.
initMonitoring();
