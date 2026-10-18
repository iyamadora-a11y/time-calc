/* 시간 & 날짜 계산기 — 오프라인 지원 서비스 워커
   앱 파일을 수정한 뒤에는 아래 CACHE 버전 숫자를 올려주세요 (예: v1 → v2). */

var CACHE = "tdc-v38";

var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(ASSETS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  // 구글 폰트는 처음 한 번 받아 캐시에 두고, 이후에는 오프라인에서도 같은 글꼴로 보입니다
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(req).then(function(cached){
        if (cached) return cached;
        return fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
          return res;
        }).catch(function(){ return cached; });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 페이지 요청: 네트워크 우선, 실패하면 캐시된 앱 화면
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
        return res;
      }).catch(function(){
        return caches.match("./index.html");
      })
    );
    return;
  }

  // 그 외 정적 파일: 캐시 우선
  event.respondWith(
    caches.match(req).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
