const RAPID_API_KEY = "bfc61495bdmsh27d4202f3fc9a11p1b93b8jsn28435328d6e5";

const RAPID_API_HOST =
    "youtube-mp3-audio-video-downloader.p.rapidapi.com";


async function obtenerInfoVideo(videoId) {

    const url =
        `https://${RAPID_API_HOST}/get-videos-info/${encodeURIComponent(videoId)}?response_mode=default`;


    console.log(
        "Consultando:",
        url
    );


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {

                    "accept":
                        "application/json",

                    "x-rapidapi-host":
                        RAPID_API_HOST,

                    "x-rapidapi-key":
                        RAPID_API_KEY

                }
            }
        );


    console.log(
        "INFO STATUS:",
        response.status
    );


    if(!response.ok) {

        const texto =
            await response.text();


        console.error(
            texto
        );


        throw new Error(
            `Error API: ${response.status}`
        );

    }


    return await response.json();

}



async function descargarAudioMP3(videoId) {

    const url =
        `https://${RAPID_API_HOST}/download-mp3/${encodeURIComponent(videoId)}?quality=high`;


    console.log(
        "Descargando:",
        url
    );


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {

                    "x-rapidapi-host":
                        RAPID_API_HOST,

                    "x-rapidapi-key":
                        RAPID_API_KEY

                }
            }
        );


    console.log(
        "DOWNLOAD STATUS:",
        response.status
    );


    console.log(
        "CONTENT TYPE:",
        response.headers.get(
            "content-type"
        )
    );


    if(!response.ok) {

        const texto =
            await response.text();


        console.error(
            "ERROR API:",
            texto
        );


        throw new Error(
            `Error descargando: ${response.status}`
        );

    }


    const contentType =
        response.headers.get(
            "content-type"
        )
        ||
        "";


    /*
       SI LA API DEVUELVE JSON
    */

    if(
        contentType.includes(
            "application/json"
        )
    ) {

        const data =
            await response.json();


        console.log(
            "JSON DOWNLOAD:",
            data
        );


        return {

            type:
                "json",

            data:
                data

        };

    }


    /*
       SI DEVUELVE EL AUDIO DIRECTAMENTE
    */

    const blob =
        await response.blob();


    console.log(
        "BLOB:",
        blob.type,
        blob.size
    );


    return {

        type:
            "blob",

        blob:
            blob

    };

}



const DB_NAME = "nova-music-db";
const STORE = "songs";
const DB_VERSION = 2;

let db;
let songs = [];
let currentIndex = -1;
let currentUrl = null;
let deferredPrompt = null;

const audio = document.getElementById("audio");


/* =========================================================
   INDEXED DB
========================================================= */

function openDB() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            DB_NAME,
            DB_VERSION
        );


        request.onupgradeneeded = event => {

            const database =
                event.target.result;


            if(
                !database
                    .objectStoreNames
                    .contains(STORE)
            ) {

                database.createObjectStore(
                    STORE,
                    {
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

            }

        };


        request.onsuccess = event => {

            resolve(
                event.target.result
            );

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}


function store(mode = "readonly") {

    return db
        .transaction(
            STORE,
            mode
        )
        .objectStore(
            STORE
        );

}


function getAllSongs() {

    return new Promise((resolve, reject) => {

        const request =
            store().getAll();


        request.onsuccess = () => {

            resolve(
                request.result || []
            );

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}


function addSong(song) {

    return new Promise((resolve, reject) => {

        const request =
            store("readwrite")
                .add(song);


        request.onsuccess = () => {

            resolve(
                request.result
            );

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}


function updateSong(song) {

    return new Promise((resolve, reject) => {

        const request =
            store("readwrite")
                .put(song);


        request.onsuccess = () => {

            resolve();

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}


function deleteSong(id) {

    return new Promise((resolve, reject) => {

        const request =
            store("readwrite")
                .delete(id);


        request.onsuccess = () => {

            resolve();

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}


function clearLibrary() {

    return new Promise((resolve, reject) => {

        const request =
            store("readwrite")
                .clear();


        request.onsuccess = () => {

            resolve();

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}



/* =========================================================
   IMPORTAR MÚSICA LOCAL
========================================================= */

function getSongName(filename) {

    const clean =
        filename.replace(
            /\.[^/.]+$/,
            ""
        );


    const parts =
        clean.split(" - ");


    if(parts.length >= 2) {

        return {

            artist:
                parts[0].trim(),

            title:
                parts
                    .slice(1)
                    .join(" - ")
                    .trim()

        };

    }


    return {

        artist:
            "Archivo local",

        title:
            clean

    };

}


async function importMusic(files) {

    for(const file of files) {

        if(
            !file.type
                .startsWith("audio/")
        ) {

            continue;

        }


        const info =
            getSongName(
                file.name
            );


        await addSong({

            title:
                info.title,

            artist:
                info.artist,

            blob:
                file,

            thumbnail:
                "",

            addedAt:
                Date.now(),

            favorite:
                false,

            plays:
                0,

            lastPlayed:
                0,

            genre:
                "Otros"

        });

    }


    await refreshSongs();

}



/* =========================================================
   REFRESCAR
========================================================= */

async function refreshSongs() {

    songs =
        await getAllSongs();


    songs.sort(
        (a, b) =>
            b.addedAt
            -
            a.addedAt
    );


    renderCurrentPage();

}



/* =========================================================
   SEGURIDAD HTML
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text ?? "";


    return div.innerHTML;

}



/* =========================================================
   ELEMENTO CANCIÓN
========================================================= */

function createSongRow(song) {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "song-item";


    const cover = song.thumbnail

        ? `
            <img
                src="${escapeHTML(song.thumbnail)}"
                class="song-image"
                alt=""
            >
        `

        : "♫";


    row.innerHTML = `

        <div class="song-cover">

            ${cover}

        </div>


        <div class="song-info">

            <strong>
                ${escapeHTML(song.title)}
            </strong>

            <span>
                ${escapeHTML(song.artist)}
            </span>

        </div>


        <button
            class="song-more"
            type="button"
            aria-label="Favorito"
        >

            ${
                song.favorite
                ?
                "♥"
                :
                "⋮"
            }

        </button>

    `;


    row.addEventListener(
        "click",
        async event => {

            if(
                event.target
                    .classList
                    .contains(
                        "song-more"
                    )
            ) {

                event.stopPropagation();

                await toggleFavorite(
                    song.id
                );

                return;

            }


            await playSong(
                song.id,
                true
            );

        }
    );


    return row;

}



/* =========================================================
   LLENAR LISTA
========================================================= */

function fillList(
    containerId,
    list,
    emptyId
) {

    const container =
        document.getElementById(
            containerId
        );


    if(!container) {

        return;

    }


    container.innerHTML =
        "";


    list.forEach(song => {

        container.appendChild(
            createSongRow(
                song
            )
        );

    });


    const empty =
        document.getElementById(
            emptyId
        );


    if(empty) {

        empty
            .classList
            .toggle(
                "hidden",
                list.length > 0
            );

    }

}



/* =========================================================
   RENDER PÁGINA
========================================================= */

function renderCurrentPage() {

    const phone =
        document.querySelector(
            ".phone"
        );


    const page =
        phone
        ?
        phone.dataset.page
        :
        "";


    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(button => {

            button
                .classList
                .toggle(
                    "active",
                    button.dataset.page === page
                );

        });


    if(page === "home") {

        fillList(

            "homeSongList",

            songs.slice(
                0,
                5
            ),

            "emptyHome"

        );

    }


    if(page === "library") {

        fillList(

            "libraryList",

            songs,

            "libraryEmpty"

        );

    }


    if(page === "favorites") {

        fillList(

            "favoritesList",

            songs.filter(
                song =>
                    song.favorite
            ),

            "favoritesListEmpty"

        );

    }


    if(page === "for-you") {

        const ordered =
            [...songs]
                .sort(
                    (a, b) =>
                        (b.plays || 0)
                        -
                        (a.plays || 0)
                );


        fillList(

            "forYouList",

            ordered,

            "forYouListEmpty"

        );

    }


    if(page === "trending") {

        const ordered =
            [...songs]
                .sort(
                    (a, b) =>
                        (b.lastPlayed || 0)
                        -
                        (a.lastPlayed || 0)
                );


        fillList(

            "trendingList",

            ordered,

            "trendingListEmpty"

        );

    }


    if(page === "hits") {

        const ordered =
            [...songs]
                .sort(
                    (a, b) => {

                        if(
                            a.favorite
                            !==
                            b.favorite
                        ) {

                            return (
                                Number(b.favorite)
                                -
                                Number(a.favorite)
                            );

                        }


                        return (
                            (b.plays || 0)
                            -
                            (a.plays || 0)
                        );

                    }
                );


        fillList(

            "hitsList",

            ordered,

            "hitsListEmpty"

        );

    }


    if(page === "search") {

        searchLocal();

    }


    if(page === "player") {

        loadPlayer();

    }


    setupMiniPlayer();

}



/* =========================================================
   BÚSQUEDA LOCAL
========================================================= */

function searchLocal() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if(!input) {

        return;

    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    if(
        query.includes(
            "youtube.com"
        )

        ||

        query.includes(
            "youtu.be"
        )

        ||

        /^[a-zA-Z0-9_-]{11}$/
            .test(query)
    ) {

        fillList(
            "searchResults",
            [],
            "searchEmpty"
        );

        return;

    }


    const result = query

        ? songs.filter(song => {

            return (

                song.title
                    .toLowerCase()
                    .includes(query)

                ||

                song.artist
                    .toLowerCase()
                    .includes(query)

            );

        })

        : [];


    fillList(

        "searchResults",

        result,

        "searchEmpty"

    );

}



/* =========================================================
   EXTRAER ID YOUTUBE
========================================================= */

function obtenerYouTubeId(value) {

    value =
        value.trim();


    if(
        /^[a-zA-Z0-9_-]{11}$/
            .test(value)
    ) {

        return value;

    }


    try {

        const url =
            new URL(value);


        if(
            url.hostname
                .includes(
                    "youtu.be"
                )
        ) {

            return url.pathname
                .replace(
                    "/",
                    ""
                )
                .substring(
                    0,
                    11
                );

        }


        const video =
            url.searchParams
                .get("v");


        if(video) {

            return video.substring(
                0,
                11
            );

        }


        if(
            url.pathname
                .includes(
                    "/shorts/"
                )
        ) {

            return url.pathname
                .split(
                    "/shorts/"
                )[1]
                ?.split("/")[0]
                ?.substring(
                    0,
                    11
                );

        }

    }
    catch(error) {

        return null;

    }


    return null;

}



/* =========================================================
   BUSCAR VIDEO ONLINE
========================================================= */

const youtubeSearchBtn =
    document.getElementById(
        "youtubeSearchBtn"
    );


if(youtubeSearchBtn) {

    youtubeSearchBtn
        .addEventListener(
            "click",
            async () => {

                const input =
                    document.getElementById(
                        "searchInput"
                    );


                const result =
                    document.getElementById(
                        "youtubeResult"
                    );


                if(
                    !input
                    ||
                    !result
                ) {

                    return;

                }


                const value =
                    input.value.trim();


                if(!value) {

                    result.innerHTML = `

                        <p class="api-error">

                            Escribe una URL o ID de YouTube.

                        </p>

                    `;

                    return;

                }


                const videoId =
                    obtenerYouTubeId(
                        value
                    );


                if(!videoId) {

                    result.innerHTML = `

                        <p class="api-error">

                            No pude obtener el ID del video.

                        </p>

                    `;

                    return;

                }


                result.innerHTML = `

                    <div class="loading-api">

                        Buscando...

                    </div>

                `;


                try {

                    const data =
                        await obtenerInfoVideo(
                            videoId
                        );


                    console.log(
                        "INFO VIDEO:",
                        data
                    );


                    const video =
                        data[videoId]
                        ||
                        data;


                    if(
                        !video
                        ||
                        !video.title
                    ) {

                        throw new Error(
                            "No se encontró información del video."
                        );

                    }


                    const thumbnails =
                        video.thumbnail
                        ||
                        [];


                    const thumbnail =
                        thumbnails.length

                        ?

                        thumbnails[
                            thumbnails.length - 1
                        ].url

                        :

                        "";


                    result.innerHTML = `

                        <div class="youtube-card">


                            ${
                                thumbnail

                                ?

                                `
                                <img
                                    src="${escapeHTML(thumbnail)}"
                                    class="youtube-cover"
                                    alt=""
                                >
                                `

                                :

                                ""
                            }


                            <div class="youtube-card-info">


                                <h3>

                                    ${escapeHTML(
                                        video.title
                                    )}

                                </h3>


                                <p>

                                    ${escapeHTML(
                                        video.author
                                        ||
                                        "Artista desconocido"
                                    )}

                                </p>


                                <span>

                                    ${formatDuration(
                                        Number(
                                            video.lengthSeconds
                                        )
                                    )}

                                </span>


                                <button
                                    type="button"
                                    class="primary-wide download-online"

                                    data-download-id="${videoId}"

                                    data-title="${encodeURIComponent(
                                        video.title
                                    )}"

                                    data-artist="${encodeURIComponent(
                                        video.author
                                        ||
                                        "Artista desconocido"
                                    )}"

                                    data-thumbnail="${encodeURIComponent(
                                        thumbnail
                                    )}"
                                >

                                    ↓ Descargar

                                </button>


                                <div
                                    class="download-message"
                                    id="download-message-${videoId}"
                                >
                                </div>


                            </div>

                        </div>

                    `;

                }
                catch(error) {

                    console.error(
                        "ERROR BUSCANDO VIDEO:",
                        error
                    );


                    result.innerHTML = `

                        <p class="api-error">

                            Error: ${escapeHTML(
                                error.message
                            )}

                        </p>

                    `;

                }

            }
        );

}



/* =========================================================
   DESCARGA ONLINE
========================================================= */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target
                .closest(
                    "[data-download-id]"
                );


        if(!button) {

            return;

        }


        event.preventDefault();


        const videoId =
            button.dataset.downloadId;


        const title =
            decodeURIComponent(
                button.dataset.title
                ||
                "Canción"
            );


        const artist =
            decodeURIComponent(
                button.dataset.artist
                ||
                "Artista desconocido"
            );


        const thumbnail =
            decodeURIComponent(
                button.dataset.thumbnail
                ||
                ""
            );


        const message =
            document.getElementById(
                `download-message-${videoId}`
            );


        button.disabled =
            true;


        button.textContent =
            "Descargando...";


        if(message) {

            message.textContent =
                "Solicitando audio...";

        }


        try {

            /*
               descargarAudioMP3 está
               definido en api.js
            */

            const resultado =
                await descargarAudioMP3(
                    videoId
                );


            console.log(
                "RESULTADO DOWNLOAD:",
                resultado
            );


            let audioBlob = null;



            /* ==================================
               CASO 1:
               api.js devuelve directamente Blob
            ================================== */

            if(
                resultado
                instanceof Blob
            ) {

                audioBlob =
                    resultado;

            }



            /* ==================================
               CASO 2:
               api.js devuelve { type:"blob" }
            ================================== */

            else if(
                resultado
                &&
                resultado.type ===
                "blob"
            ) {

                audioBlob =
                    resultado.blob;

            }



            /* ==================================
               CASO 3:
               API devuelve JSON
            ================================== */

            else if(
                resultado
                &&
                resultado.type ===
                "json"
            ) {

                const data =
                    resultado.data;


                console.log(
                    "JSON DE DESCARGA:",
                    data
                );


                const downloadUrl =
                    encontrarUrlAudio(
                        data
                    );


                if(!downloadUrl) {

                    throw new Error(
                        "La API respondió JSON, pero no encontré la URL del audio."
                    );

                }


                if(message) {

                    message.textContent =
                        "Obteniendo archivo de audio...";

                }


                const finalResponse =
                    await fetch(
                        downloadUrl
                    );


                if(
                    !finalResponse.ok
                ) {

                    throw new Error(
                        "No se pudo obtener el archivo final. HTTP "
                        +
                        finalResponse.status
                    );

                }


                audioBlob =
                    await finalResponse.blob();

            }



            /* ==================================
               CASO 4:
               JSON normal
            ================================== */

            else if(
                resultado
                &&
                typeof resultado
                ===
                "object"
            ) {

                const downloadUrl =
                    encontrarUrlAudio(
                        resultado
                    );


                if(downloadUrl) {

                    if(message) {

                        message.textContent =
                            "Obteniendo audio...";

                    }


                    const finalResponse =
                        await fetch(
                            downloadUrl
                        );


                    if(
                        !finalResponse.ok
                    ) {

                        throw new Error(
                            "Error descargando archivo final."
                        );

                    }


                    audioBlob =
                        await finalResponse.blob();

                }

            }



            /* ==================================
               VALIDAR BLOB
            ================================== */

            if(!audioBlob) {

                throw new Error(
                    "La API no devolvió ningún archivo de audio."
                );

            }


            if(
                audioBlob.size === 0
            ) {

                throw new Error(
                    "El archivo recibido está vacío."
                );

            }


            console.log(
                "AUDIO BLOB:",
                audioBlob.type,
                audioBlob.size
            );


            if(message) {

                message.textContent =
                    "Guardando en tu biblioteca...";

            }



            /* ==================================
               GUARDAR EN INDEXED DB
            ================================== */

            await addSong({

                title:
                    title,

                artist:
                    artist,

                blob:
                    audioBlob,

                thumbnail:
                    thumbnail,

                addedAt:
                    Date.now(),

                favorite:
                    false,

                plays:
                    0,

                lastPlayed:
                    0,

                genre:
                    "Otros"

            });


            await refreshSongs();


            button.textContent =
                "✓ Guardada";


            if(message) {

                message.textContent =
                    "✓ Descargada correctamente";

            }


            setTimeout(
                () => {

                    location.href =
                        "biblioteca.html";

                },
                1000
            );

        }
        catch(error) {

            console.error(
                "ERROR DE DESCARGA:",
                error
            );


            button.disabled =
                false;


            button.textContent =
                "↓ Descargar";


            if(message) {

                message.textContent =
                    "Error: "
                    +
                    error.message;

            }


            alert(
                "No se pudo descargar:\n\n"
                +
                error.message
            );

        }

    }
);



/* =========================================================
   BUSCAR URL DE AUDIO EN JSON
========================================================= */

function encontrarUrlAudio(data) {

    if(!data) {

        return null;

    }


    /*
       Campos comunes
    */

    const posibles = [

        data.url,

        data.downloadUrl,

        data.download_url,

        data.audioUrl,

        data.audio_url,

        data.link,

        data.download,

        data.file,

        data.fileUrl,

        data.file_url

    ];


    for(
        const value
        of posibles
    ) {

        if(
            typeof value === "string"
            &&
            value.startsWith("http")
        ) {

            return value;

        }

    }


    /*
       Revisar objetos internos
    */

    for(
        const key
        of Object.keys(data)
    ) {

        const value =
            data[key];


        if(
            typeof value === "string"
            &&
            value.startsWith("http")
        ) {

            const lower =
                key.toLowerCase();


            if(
                lower.includes("audio")
                ||
                lower.includes("download")
                ||
                lower.includes("url")
                ||
                lower.includes("link")
            ) {

                return value;

            }

        }


        if(
            value
            &&
            typeof value === "object"
        ) {

            const found =
                encontrarUrlAudio(
                    value
                );


            if(found) {

                return found;

            }

        }

    }


    return null;

}



/* =========================================================
   FAVORITOS
========================================================= */

async function toggleFavorite(id) {

    const song =
        songs.find(
            item =>
                item.id === id
        );


    if(!song) {

        return;

    }


    song.favorite =
        !song.favorite;


    await updateSong(
        song
    );


    await refreshSongs();


    updateFavoriteButtons();

}



/* =========================================================
   CURRENT SONG
========================================================= */

function currentSongId() {

    return Number(

        localStorage
            .getItem(
                "novaCurrentId"
            )

        ||

        0

    );

}



/* =========================================================
   PLAY SONG
========================================================= */

async function playSong(
    id,
    openPlayer = false
) {

    const index =
        songs.findIndex(
            song =>
                song.id === id
        );


    if(index === -1) {

        return;

    }


    currentIndex =
        index;


    const song =
        songs[index];


    song.plays =
        (song.plays || 0)
        +
        1;


    song.lastPlayed =
        Date.now();


    await updateSong(
        song
    );


    localStorage.setItem(
        "novaCurrentId",
        String(id)
    );


    if(audio) {

        if(currentUrl) {

            URL.revokeObjectURL(
                currentUrl
            );

        }


        currentUrl =
            URL.createObjectURL(
                song.blob
            );


        audio.src =
            currentUrl;


        try {

            await audio.play();

        }
        catch(error) {

            console.log(
                error
            );

        }

    }


    if(
        openPlayer
        &&
        !location.pathname
            .endsWith(
                "reproductor.html"
            )
    ) {

        location.href =
            "reproductor.html";

        return;

    }


    setupMiniPlayer();

}



/* =========================================================
   CARGAR AUDIO ACTUAL
========================================================= */

function loadCurrentAudio() {

    if(!audio) {

        return;

    }


    const id =
        currentSongId();


    const song =
        songs.find(
            item =>
                item.id === id
        );


    if(!song) {

        return;

    }


    currentIndex =
        songs.findIndex(
            item =>
                item.id === id
        );


    if(!audio.src) {

        currentUrl =
            URL.createObjectURL(
                song.blob
            );


        audio.src =
            currentUrl;

    }

}



/* =========================================================
   REPRODUCTOR
========================================================= */

function loadPlayer() {

    const song =
        songs.find(
            item =>
                item.id
                ===
                currentSongId()
        );


    if(!song) {

        return;

    }


    const title =
        document.getElementById(
            "playerTitle"
        );


    const artist =
        document.getElementById(
            "playerArtist"
        );


    if(title) {

        title.textContent =
            song.title;

    }


    if(artist) {

        artist.textContent =
            song.artist;

    }


    loadCurrentAudio();

    updateFavoriteButtons();

}



/* =========================================================
   MINI PLAYER
========================================================= */

function setupMiniPlayer() {

    const mini =
        document.getElementById(
            "globalMiniPlayer"
        );


    if(!mini) {

        return;

    }


    const song =
        songs.find(
            item =>
                item.id
                ===
                currentSongId()
        );


    mini
        .classList
        .toggle(
            "hidden",
            !song
        );


    if(!song) {

        return;

    }


    const title =
        document.getElementById(
            "miniTitle"
        );


    const artist =
        document.getElementById(
            "miniArtist"
        );


    if(title) {

        title.textContent =
            song.title;

    }


    if(artist) {

        artist.textContent =
            song.artist;

    }


    loadCurrentAudio();

}



/* =========================================================
   PLAY PAUSE
========================================================= */

function togglePlay() {

    if(!audio) {

        return;

    }


    if(!currentSongId()) {

        if(songs.length) {

            playSong(
                songs[0].id
            );

        }

        return;

    }


    loadCurrentAudio();


    if(audio.paused) {

        audio.play();

    }
    else {

        audio.pause();

    }

}


function syncPlayButton() {

    const icon =
        audio
        &&
        !audio.paused

        ?

        "⏸"

        :

        "▶";


    document
        .querySelectorAll(
            "#playBtn,#miniPlayBtn"
        )
        .forEach(button => {

            button.textContent =
                icon;

        });

}



/* =========================================================
   SIGUIENTE / ANTERIOR
========================================================= */

function nextSong(
    movement = 1
) {

    if(!songs.length) {

        return;

    }


    let index =
        songs.findIndex(
            song =>
                song.id
                ===
                currentSongId()
        );


    if(index < 0) {

        index = 0;

    }
    else {

        index =
            (
                index
                +
                movement
                +
                songs.length
            )
            %
            songs.length;

    }


    playSong(
        songs[index].id
    );


    loadPlayer();

}



/* =========================================================
   BOTONES FAVORITO
========================================================= */

function updateFavoriteButtons() {

    const song =
        songs.find(
            item =>
                item.id
                ===
                currentSongId()
        );


    document
        .querySelectorAll(
            "#favoriteBtn,#favoriteBig"
        )
        .forEach(button => {

            button.textContent =

                song
                &&
                song.favorite

                ?

                "♥"

                :

                "♡";

        });

}



/* =========================================================
   FORMAT TIME
========================================================= */

function formatDuration(seconds) {

    if(
        !Number.isFinite(
            seconds
        )
    ) {

        return "0:00";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        )
            .toString()
            .padStart(
                2,
                "0"
            );


    return `${minutes}:${secs}`;

}



/* =========================================================
   CLICKS GENERALES
========================================================= */

document.addEventListener(
    "click",
    async event => {


        const addButton =
            event.target
                .closest(
                    '[data-action="add-music"]'
                );


        if(addButton) {

            document
                .getElementById(
                    "fileInput"
                )
                ?.click();

        }


        if(
            event.target.id
            ===
            "miniPlayBtn"
        ) {

            event.preventDefault();

            event.stopPropagation();

            togglePlay();

        }


        if(
            event.target.id
            ===
            "playBtn"
        ) {

            togglePlay();

        }


        if(
            event.target.id
            ===
            "nextBtn"
        ) {

            nextSong(
                1
            );

        }


        if(
            event.target.id
            ===
            "prevBtn"
        ) {

            nextSong(
                -1
            );

        }


        if(
            event.target.id
            ===
            "favoriteBtn"

            ||

            event.target.id
            ===
            "favoriteBig"
        ) {

            const id =
                currentSongId();


            if(id) {

                await toggleFavorite(
                    id
                );

            }

        }


        if(
            event.target.id
            ===
            "deleteCurrentBtn"
        ) {

            const id =
                currentSongId();


            if(
                id
                &&
                confirm(
                    "¿Eliminar esta canción?"
                )
            ) {

                await deleteSong(
                    id
                );


                localStorage
                    .removeItem(
                        "novaCurrentId"
                    );


                location.href =
                    "biblioteca.html";

            }

        }


        if(
            event.target.id
            ===
            "clearLibraryBtn"
        ) {

            if(
                confirm(
                    "¿Borrar toda tu biblioteca?"
                )
            ) {

                await clearLibrary();


                localStorage
                    .removeItem(
                        "novaCurrentId"
                    );


                await refreshSongs();

            }

        }


        if(
            event.target
                .classList
                .contains(
                    "tab"
                )
        ) {

            document
                .querySelectorAll(
                    ".tab"
                )
                .forEach(tab => {

                    tab
                        .classList
                        .remove(
                            "active"
                        );

                });


            event.target
                .classList
                .add(
                    "active"
                );


            const filter =
                event.target
                    .dataset
                    .filter;


            let result =
                songs;


            if(
                filter ===
                "favorites"
            ) {

                result =
                    songs.filter(
                        song =>
                            song.favorite
                    );

            }


            if(
                filter ===
                "recent"
            ) {

                result =
                    [...songs]
                        .sort(
                            (a, b) =>
                                (b.lastPlayed || 0)
                                -
                                (a.lastPlayed || 0)
                        );

            }


            fillList(

                "libraryList",

                result,

                "libraryEmpty"

            );

        }

    }
);



/* =========================================================
   INPUTS
========================================================= */

document.addEventListener(
    "input",
    event => {

        if(
            event.target.id
            ===
            "searchInput"
        ) {

            searchLocal();

        }


        if(
            event.target.id
            ===
            "seek"

            &&

            audio
        ) {

            audio.currentTime =
                Number(
                    event.target.value
                );

        }

    }
);



document.addEventListener(
    "change",
    async event => {

        if(
            event.target.id
            ===
            "fileInput"
        ) {

            await importMusic(
                [
                    ...event.target.files
                ]
            );


            event.target.value =
                "";

        }

    }
);



/* =========================================================
   AUDIO EVENTS
========================================================= */

if(audio) {

    audio.addEventListener(
        "play",
        syncPlayButton
    );


    audio.addEventListener(
        "pause",
        syncPlayButton
    );


    audio.addEventListener(
        "loadedmetadata",
        () => {

            const seek =
                document.getElementById(
                    "seek"
                );


            if(seek) {

                seek.max =
                    audio.duration
                    ||
                    1;

            }


            const duration =
                document.getElementById(
                    "duration"
                );


            if(duration) {

                duration.textContent =
                    formatDuration(
                        audio.duration
                    );

            }

        }
    );


    audio.addEventListener(
        "timeupdate",
        () => {

            const seek =
                document.getElementById(
                    "seek"
                );


            if(seek) {

                seek.value =
                    audio.currentTime
                    ||
                    0;

            }


            const current =
                document.getElementById(
                    "currentTime"
                );


            if(current) {

                current.textContent =
                    formatDuration(
                        audio.currentTime
                    );

            }

        }
    );


    audio.addEventListener(
        "ended",
        () => {

            nextSong(
                1
            );

        }
    );

}



/* =========================================================
   PWA
========================================================= */

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredPrompt =
            event;

    }
);


if(
    "serviceWorker"
    in
    navigator
) {

    window.addEventListener(
        "load",
        () => {

            navigator
                .serviceWorker
                .register(
                    "sw.js"
                );

        }
    );

}



/* =========================================================
   INIT
========================================================= */

async function init() {

    try {

        db =
            await openDB();


        songs =
            await getAllSongs();


        songs.sort(
            (a, b) =>
                b.addedAt
                -
                a.addedAt
        );


        renderCurrentPage();

    }
    catch(error) {

        console.error(
            "ERROR INICIANDO NOVA MUSIC:",
            error
        );

    }

}


init();