const CACHE =
"nova-music-v3";


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
                cache => {

                    return cache
                    .addAll(
                        FILES
                    );

                }
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
                keys => {

                    return Promise
                    .all(

                        keys

                        .filter(
                            key =>
                            key !== CACHE
                        )

                        .map(
                            key =>
                            caches
                            .delete(
                                key
                            )
                        )

                    );

                }
            )

        );


        self.clients.claim();

    }
);



self.addEventListener(
    "fetch",
    event => {

        if(
            event.request.method
            !==
            "GET"
        ) {

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
                    )

                    .catch(
                        () => {

                            return caches
                            .match(
                                "./index.html"
                            );

                        }
                    );

                }
            )

        );

    }
);