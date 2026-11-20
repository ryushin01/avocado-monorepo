// 백오피스 온라인 예약 API. server-only라 서버 컴포넌트·서버 액션에서만 가져올 수 있다(토큰이 서버에만 있음).
export {
  fetchBookingAvailability,
  fetchBookingOptions,
  submitBooking,
  type BookingApiResult,
} from "./booking";
