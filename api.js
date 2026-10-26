const RAPID_API_KEY = "bfc61495bdmsh27d4202f3fc9a11p1b93b8jsn28435328d6e5";

const RAPID_API_HOST =
    "youtube-mp3-audio-video-downloader.p.rapidapi.com";


async function obtenerInfoVideo(videoId) {

    const url =
        `https://${RAPID_API_HOST}/get-videos-info/${encodeURIComponent(videoId)}?response_mode=default`;


    const response = await fetch(url, {

        method: "GET",

        headers: {

            "accept":
                "application/json",

            "x-rapidapi-host":
                RAPID_API_HOST,

            "x-rapidapi-key":
                RAPID_API_KEY
        }

    });


    if(!response.ok) {

        throw new Error(
            "Error obteniendo información: "
            +
            response.status
        );

    }


    return await response.json();
}


async function descargarAudioMP3(videoId) {

    const url =
        `https://${RAPID_API_HOST}/download-mp3/${encodeURIComponent(videoId)}?quality=high`;

    console.log("Descargando desde:", url);

    const response = await fetch(url, {

        method: "GET",

        headers: {
            "x-rapidapi-host": RAPID_API_HOST,
            "x-rapidapi-key": RAPID_API_KEY
        }

    });

    console.log("STATUS:", response.status);
    console.log("CONTENT-TYPE:", response.headers.get("content-type"));

    if(!response.ok) {

        const texto = await response.text();

        console.error(
            "RESPUESTA ERROR:",
            texto
        );

        throw new Error(
            `RapidAPI respondió ${response.status}`
        );
    }

    const contentType =
        response.headers.get("content-type")
        || "";

    /*
       Algunas APIs no devuelven el MP3,
       sino JSON con una URL de descarga.
    */

    if(
        contentType.includes(
            "application/json"
        )
    ) {

        const data =
            await response.json();

        console.log(
            "RESPUESTA JSON DESCARGA:",
            data
        );

        return {
            type: "json",
            data: data
        };
    }

    const blob =
        await response.blob();

    console.log(
        "BLOB:",
        blob.type,
        blob.size
    );

    return {
        type: "blob",
        blob: blob
    };
}


    if(!response.ok) {

        throw new Error(
            "Error descargando audio: "
            +
            response.status
        );

    }


    return await response.blob();
}