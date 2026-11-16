// 손님 화면(클라이언트 컴포넌트)이 부르는 서버 액션. 백오피스 주소·토큰은 서버에만 둔다.
export {
  checkInAction,
  joinWaitlistAction,
  lookupReservationsAction,
  lookupWaitlistAction,
  type JoinState,
} from "./kiosk-actions";
