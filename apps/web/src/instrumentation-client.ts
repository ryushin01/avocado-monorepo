import { initAnalytics } from "@/shared/lib/analytics";
import { initMonitoring } from "@/shared/lib/monitoring";

// 오류 모니터링(DSN이 있을 때만)과 분석은 화면을 그리는 데 필요 없으므로 첫 화면 뒤에 따로 받는다.
initMonitoring();
void initAnalytics();
