'use strict';

/* Service Worker：缓存应用外壳，支持离线使用与"添加到主屏幕"
   更新方式：改代码后把 CACHE_VERSION 加一，用户下次联网打开即自动换新 */
const CACHE_VERSION = 'kaoyan-v1.0';
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/store.js',
  './js/charts.js',
  './js/timer.js',
  './js/main.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 缓存优先 + 后台更新：先立即返回缓存，同时拉取新版本写入缓存，
   下次打开即为最新版；完全离线时回退到 index.html */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached || caches.match('./index.html'));
      return cached ? cached : network;
    })
  );
});
