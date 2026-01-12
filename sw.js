/**
 * Service Worker for Space Hulk Tracker
 * Provides offline functionality and caching
 * 
 * Note: External resources like Google Fonts are not cached due to CORS restrictions.
 * The app will use fallback fonts when offline.
 */

const CACHE_NAME = 'space-hulk-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response (allow 'basic' and 'cors' for external resources)
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Only cache same-origin responses to avoid CORS issues
            if (response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the fetched response for future use
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(err => {
                console.log('[ServiceWorker] Failed to cache:', err);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[ServiceWorker] Fetch failed:', error);
            // Could return a custom offline page here
            throw error;
          });
      })
  );
});
