const CACHE =
    "nova-music-v4";


const FILES = [

    "./",

    "./index.html",

    "./buscar.html",

    "./biblioteca.html",

    "./reproductor.html",

    "./favoritos.html",

    "./parati.html",

    "./tendencias.html",

    "./exitos.html",

    "./generos.html",

    "./premium.html",

    "./ajustes.html",

    "./styles.css",

    "./app.js",

    "./api.js",

    "./manifest.json",

    "./icons/icon-192.svg",

    "./icons/icon-512.svg"

];



self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
            .open(
                CACHE
            )
            .then(
                cache =>
                    cache.addAll(
                        FILES
                    )
            )

        );


        self.skipWaiting();

    }
);



self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
            .keys()
            .then(
                keys =>

                    Promise.all(

                        keys

                        .filter(
                            key =>
                                key !== CACHE
                        )

                        .map(
                            key =>
                                caches.delete(
                                    key
                                )
                        )

                    )
            )

        );


        self.clients.claim();

    }
);



self.addEventListener(
    "fetch",
    event => {

        if(
            event.request.method !==
            "GET"
        ) {

            return;

        }


        /*
           Solo cacheamos archivos
           de nuestra PWA.

           No intentamos cachear
           las llamadas de RapidAPI.
        */

        const requestUrl =
            new URL(
                event.request.url
            );


        if(
            requestUrl.hostname
            .includes(
                "rapidapi.com"
            )
        ) {

            event.respondWith(
                fetch(
                    event.request
                )
            );

            return;

        }


        event.respondWith(

            caches
            .match(
                event.request
            )
            .then(
                cached => {

                    if(cached) {

                        return cached;

                    }


                    return fetch(
                        event.request
                    )
                    .then(
                        response => {

                            const copy =
                                response.clone();


                            caches
                            .open(
                                CACHE
                            )
                            .then(
                                cache => {

                                    cache.put(
                                        event.request,
                                        copy
                                    );

                                }
                            );


                            return response;

                        }
                    );

                }
            )

        );

    }
);