// ===============================
// VERSION (change to force update)
// ===============================
const CACHE_NAME = "imci-triage-v2";

// ===============================
// CORE APP SHELL (LOCAL FILES ONLY)
// ===============================
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",

  "/app.js",
  "/engine.js",
  "/i18n.js",
  "/dexie.js",

  "/flows/infant.js",
  "/flows/child.js",
  "/flows/treatmentflow.js"
];

// ===============================
// INSTALL (SAFE CACHE)
// ===============================
self.addEventListener("install", (event) => {
  console.log("🛠 SW installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS) {
        try {
          await cache.add(url);
          console.log("✅ Cached:", url);
        } catch (err) {
          console.warn("⚠️ Failed to cache:", url);
        }
      }
    })
  );

  self.skipWaiting();
});

// ===============================
// ACTIVATE (CLEAN OLD CACHE)
// ===============================
self.addEventListener("activate", (event) => {
  console.log("🚀 SW activating...");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// ===============================
// FETCH STRATEGY
// ===============================
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ❌ DO NOT cache external CDN (prevents crashes)
  if (!req.url.startsWith(self.location.origin)) {
    return;
  }

  // 🧠 JS / CSS → NETWORK FIRST (prevents duplicate execution bugs)
  if (
    req.destination === "script" ||
    req.destination === "style"
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 📄 HTML → NETWORK FIRST (fresh app load)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 🧊 OTHER → CACHE FIRST
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
      );
    })
  );
});