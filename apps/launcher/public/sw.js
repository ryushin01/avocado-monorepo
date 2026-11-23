// 키오스크 서비스 워커: 태블릿의 인터넷이 끊긴 채 페이지를 새로 열면(자동 복귀, 기기 재시작 등)
// 브라우저 오류 화면 대신 미리 받아 둔 안내 화면(offline.html)을 보여 준다.
// 화면·데이터는 저장하지 않는다. 손님 정보가 기기에 남지 않고, 늘 백오피스의 최신 정보를 보여 주기 위해서다.
// 열려 있는 화면에서 끊긴 경우는 Next.js(experimental.useOffline)가 요청을 미뤘다가 다시 보내고, OfflineNotice가 알린다.

const CACHE = "kiosk-offline-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // 페이지 이동(주소 열기·새로 고침)만 맡는다. 나머지 요청은 브라우저가 그대로 보낸다.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((response) => response ?? Response.error()),
    ),
  );
});
