const CACHE_NAME = "shoe-taka-v2";

const FILES_TO_CACHE = [
    ".",
    "/index.html",
    "/manifest.json",
    "/css/bootstrap.min.css",
    "/css/style.css",
    "/js/app.js",
    "/logo/192.png",
    "/logo/512.png",
    "/items"
];

self.addEventListener("install", event => {
    console.log("Service Worker: Installing...");

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching app files...");
            return Promise.all(
                FILES_TO_CACHE.map(url =>
                    cache.add(url).catch(err => {
                        console.warn("Failed to cache:", url, err);
                    })
                )
            );
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    console.log("Service Worker: Activated...");

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {

    // Only handle plain GET requests.
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    // NEVER touch requests to other sites. This includes Firebase
    // (Firestore, Auth, Google sign-in), so live data is never served
    // from an old cache.
    if (url.origin !== self.location.origin) {
        return;
    }

    // Pages (index.html): network first, so a new deploy shows up right
    // away. The cached copy is only a fallback when offline.
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put("/index.html", copy));
                    return networkResponse;
                })
                .catch(() => caches.match("/index.html"))
        );
        return;
    }

    // Own static files (JS, CSS, images): cache first, then network.
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {

            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                if (networkResponse.ok) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return networkResponse;
            });

        })
    );

});
