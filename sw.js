const VERSION = "v6";
const ARCHIVOS = [
    "./",
    "./estilos.css",
    "./app.js",
    "./manifest.webmanifest",
    "./icono-192.png",
    "./icono-512.png"
];

self.addEventListener("install", function (evento) {
    evento.waitUntil(
        caches.open(VERSION).then(function (cache) {
            return cache.addAll(
                ARCHIVOS.map(function (url) {
                    return new Request(url, { cache: "reload"});
                })
            );
        })
    );
});

self.addEventListener("activate", function (evento) {
    evento.waitUntil(
        caches.keys().then(function (nombres) {
            return Promise.all(
                nombres
                    .filter(function (nombre) { return nombre !== VERSION; })
                    .map(function (nombre) { return caches.delete(nombre); })
            );
        })
    );
});

self.addEventListener("fetch", function (evento) {
    evento.respondWith(
        caches.match(evento.request).then(function (respuesta) {
            return respuesta || fetch(evento.request);
        })
    );
});