const DB_NAME = "nova-music-db";

const STORE = "songs";

const DB_VERSION = 2;


let db;

let songs = [];

let currentIndex = -1;

let currentUrl = null;

let deferredPrompt = null;


const audio =
document.getElementById("audio");



/* ==================================
   DATABASE
================================== */

function openDB() {

    return new Promise(
        (resolve, reject) => {

            const request =
            indexedDB.open(
                DB_NAME,
                DB_VERSION
            );


            request.onupgradeneeded =
            event => {

                const database =
                event.target.result;


                if(
                    !database
                    .objectStoreNames
                    .contains(STORE)
                ) {

                    database
                    .createObjectStore(
                        STORE,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                }

            };


            request.onsuccess =
            event => {

                resolve(
                    event.target.result
                );

            };


            request.onerror =
            () => {

                reject(
                    request.error
                );

            };

        }
    );

}



function store(
    mode = "readonly"
) {

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

    return new Promise(
        (resolve, reject) => {

            const request =
            store().getAll();


            request.onsuccess =
            () => {

                resolve(
                    request.result || []
                );

            };


            request.onerror =
            () => {

                reject(
                    request.error
                );

            };

        }
    );

}



function addSong(song) {

    return new Promise(
        (resolve, reject) => {

            const request =

            store("readwrite")
            .add(song);


            request.onsuccess =
            () => resolve();


            request.onerror =
            () => reject(
                request.error
            );

        }
    );

}



function updateSong(song) {

    return new Promise(
        (resolve, reject) => {

            const request =

            store("readwrite")
            .put(song);


            request.onsuccess =
            () => resolve();


            request.onerror =
            () => reject(
                request.error
            );

        }
    );

}



function deleteSong(id) {

    return new Promise(
        (resolve, reject) => {

            const request =

            store("readwrite")
            .delete(id);


            request.onsuccess =
            () => resolve();


            request.onerror =
            () => reject(
                request.error
            );

        }
    );

}



function clearLibrary() {

    return new Promise(
        (resolve, reject) => {

            const request =

            store("readwrite")
            .clear();


            request.onsuccess =
            () => resolve();


            request.onerror =
            () => reject(
                request.error
            );

        }
    );

}



/* ==================================
   IMPORTAR
================================== */

function songName(filename) {

    const clean =

    filename.replace(
        /\.[^/.]+$/,
        ""
    );


    const parts =
    clean.split(" - ");


    if(
        parts.length >= 2
    ) {

        return {

            artist:
            parts[0],

            title:
            parts
            .slice(1)
            .join(" - ")

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

    for(
        const file
        of files
    ) {

        if(
            !file.type
            .startsWith("audio/")
        ) {

            continue;

        }


        const info =
        songName(
            file.name
        );


        await addSong({

            title:
            info.title,

            artist:
            info.artist,

            blob:
            file,

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


    await refresh();

}



/* ==================================
   REFRESH
================================== */

async function refresh() {

    songs =
    await getAllSongs();


    songs.sort(
        (a,b) =>
        b.addedAt -
        a.addedAt
    );


    renderPage();

}



/* ==================================
   HTML SONG
================================== */

function createSongRow(song) {

    const row =
    document.createElement(
        "div"
    );


    row.className =
    "song-item";


    row.innerHTML = `

        <div class="song-cover">

            ♫

        </div>


        <div class="song-info">

            <strong>
                ${escapeHTML(song.title)}
            </strong>

            <span>
                ${escapeHTML(song.artist)}
            </span>

        </div>


        <button class="song-more">

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
        event => {

            if(
                event.target
                .classList
                .contains(
                    "song-more"
                )
            ) {

                event.stopPropagation();

                toggleFavorite(
                    song.id
                );

                return;

            }


            playSong(
                song.id,
                true
            );

        }
    );


    return row;

}



function escapeHTML(text) {

    const div =
    document.createElement(
        "div"
    );


    div.textContent =
    text;


    return div.innerHTML;

}



/* ==================================
   LISTAS
================================== */

function fillList(
    id,
    list,
    empty
) {

    const container =
    document.getElementById(
        id
    );


    if(!container) {

        return;

    }


    container.innerHTML =
    "";


    list.forEach(
        song => {

            container
            .appendChild(
                createSongRow(song)
            );

        }
    );


    const emptyElement =
    document.getElementById(
        empty
    );


    if(emptyElement) {

        emptyElement
        .classList
        .toggle(
            "hidden",
            list.length > 0
        );

    }

}



/* ==================================
   RENDER PAGE
================================== */

function renderPage() {

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
    .forEach(
        button => {

            button
            .classList
            .toggle(
                "active",
                button.dataset.page
                ===
                page
            );

        }
    );



    if(
        page === "home"
    ) {

        fillList(

            "homeSongList",

            songs.slice(
                0,
                5
            ),

            "emptyHome"

        );

    }



    if(
        page === "library"
    ) {

        fillList(

            "libraryList",

            songs,

            "libraryEmpty"

        );

    }



    if(
        page === "favorites"
    ) {

        fillList(

            "favoritesList",

            songs.filter(
                song =>
                song.favorite
            ),

            "favoritesListEmpty"

        );

    }



    if(
        page === "for-you"
    ) {

        const ordered =

        [...songs]
        .sort(
            (a,b) =>

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



    if(
        page === "trending"
    ) {

        const recent =

        [...songs]
        .sort(
            (a,b) =>

            (b.lastPlayed || 0)

            -

            (a.lastPlayed || 0)

        );


        fillList(

            "trendingList",

            recent,

            "trendingListEmpty"

        );

    }



    if(
        page === "hits"
    ) {

        const hits =

        [...songs]
        .sort(
            (a,b) => {

                if(
                    a.favorite
                    !==
                    b.favorite
                ) {

                    return Number(
                        b.favorite
                    )
                    -
                    Number(
                        a.favorite
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

            hits,

            "hitsListEmpty"

        );

    }



    if(
        page === "search"
    ) {

        searchSongs();

    }



    if(
        page === "genres"
    ) {

        filterGenre(
            "Otros"
        );

    }



    if(
        page === "player"
    ) {

        loadPlayer();

    }


    setupMiniPlayer();

}



/* ==================================
   SEARCH
================================== */

function searchSongs() {

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


    const result =

    query

    ?

    songs.filter(
        song => {

            return (

                song.title
                .toLowerCase()
                .includes(query)

                ||

                song.artist
                .toLowerCase()
                .includes(query)

            );

        }
    )

    :

    [];


    fillList(

        "searchResults",

        result,

        "searchEmpty"

    );

}



/* ==================================
   FAVORITOS
================================== */

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


    await refresh();


    updateFavoriteButtons();

}



/* ==================================
   CURRENT SONG
================================== */

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



/* ==================================
   PLAY SONG
================================== */

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


    localStorage
    .setItem(

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



/* ==================================
   LOAD AUDIO
================================== */

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


    if(
        !audio.src
    ) {

        currentUrl =

        URL.createObjectURL(
            song.blob
        );


        audio.src =
        currentUrl;

    }

}



/* ==================================
   PLAYER
================================== */

function loadPlayer() {

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



/* ==================================
   MINI PLAYER
================================== */

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



/* ==================================
   PLAY / PAUSE
================================== */

function togglePlay() {

    if(!audio) {

        return;

    }


    if(
        !currentSongId()
    ) {

        if(
            songs.length > 0
        ) {

            playSong(
                songs[0].id
            );

        }

        return;

    }


    loadCurrentAudio();


    if(
        audio.paused
    ) {

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
    .forEach(
        button => {

            button.textContent =
            icon;

        }
    );

}



/* ==================================
   NEXT
================================== */

function nextSong(
    movement = 1
) {

    if(
        !songs.length
    ) {

        return;

    }


    let index =

    songs.findIndex(
        song =>
        song.id
        ===
        currentSongId()
    );


    if(
        index < 0
    ) {

        index =
        0;

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



/* ==================================
   FAVORITE BUTTON PLAYER
================================== */

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
    .forEach(
        button => {

            if(button) {

                button.textContent =

                song
                &&
                song.favorite

                ?

                "♥"

                :

                "♡";

            }

        }
    );

}



/* ==================================
   GENRES
================================== */

function filterGenre(
    genre
) {

    const container =
    document.getElementById(
        "genreResults"
    );


    if(!container) {

        return;

    }


    container.innerHTML =
    "";


    const result =

    genre === "Otros"

    ?

    songs

    :

    songs.filter(
        song =>
        song.genre === genre
    );


    result.forEach(
        song => {

            container
            .appendChild(
                createSongRow(song)
            );

        }
    );

}



/* ==================================
   TIME
================================== */

function formatTime(
    seconds
) {

    if(
        !Number
        .isFinite(
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



/* ==================================
   CLICKS
================================== */

document
.addEventListener(
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

            nextSong(1);

        }



        if(
            event.target.id
            ===
            "prevBtn"
        ) {

            nextSong(-1);

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

                toggleFavorite(id);

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

                await deleteSong(id);


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
                    "¿Borrar toda tu música?"
                )
            ) {

                await clearLibrary();


                localStorage
                .removeItem(
                    "novaCurrentId"
                );


                await refresh();

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
            .forEach(
                tab => {

                    tab
                    .classList
                    .remove(
                        "active"
                    );

                }
            );


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
                filter
                ===
                "favorites"
            ) {

                result =

                songs.filter(
                    song =>
                    song.favorite
                );

            }


            if(
                filter
                ===
                "recent"
            ) {

                result =

                [...songs]
                .sort(
                    (a,b) =>

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



        if(
            event.target
            .classList
            .contains(
                "genre-card"
            )
        ) {

            filterGenre(

                event.target
                .dataset
                .genre

            );

        }



        if(
            event.target.id
            ===
            "installAppBtn"
        ) {

            if(
                deferredPrompt
            ) {

                deferredPrompt
                .prompt();


                await deferredPrompt
                .userChoice;


                deferredPrompt =
                null;

            }
            else {

                alert(

                    "Abre el menú de tu navegador y selecciona 'Instalar aplicación' o 'Agregar a pantalla de inicio'."

                );

            }

        }

    }
);



/* ==================================
   INPUTS
================================== */

document
.addEventListener(
    "input",
    event => {


        if(
            event.target.id
            ===
            "searchInput"
        ) {

            searchSongs();

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



document
.addEventListener(
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



        if(
            event.target.id
            ===
            "compactToggle"
        ) {

            document.body
            .classList
            .toggle(

                "compact",

                event.target.checked

            );


            localStorage
            .setItem(

                "compact",

                event.target.checked
                ?
                "1"
                :
                "0"

            );

        }

    }
);



/* ==================================
   AUDIO EVENTS
================================== */

if(audio) {


    audio
    .addEventListener(
        "play",
        syncPlayButton
    );


    audio
    .addEventListener(
        "pause",
        syncPlayButton
    );


    audio
    .addEventListener(
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
                formatTime(
                    audio.duration
                );

            }

        }
    );


    audio
    .addEventListener(
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
                formatTime(
                    audio.currentTime
                );

            }

        }
    );


    audio
    .addEventListener(
        "ended",
        () => {

            nextSong(1);

        }
    );

}



/* ==================================
   PWA
================================== */

window
.addEventListener(
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

    window
    .addEventListener(
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



/* ==================================
   INIT
================================== */

async function init() {

    db =
    await openDB();


    songs =
    await getAllSongs();


    if(
        localStorage
        .getItem(
            "compact"
        )
        ===
        "1"
    ) {

        document.body
        .classList
        .add(
            "compact"
        );

    }


    renderPage();

}


init();