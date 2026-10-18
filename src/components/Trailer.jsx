import { useEffect, useRef, useState } from "react";
import { trailerDoJogo } from "../utils.js";

// O hls.js só é baixado quando o primeiro trailer vai tocar (Safari toca HLS nativamente).
let carregarHls = null;
const obterHls = () => (carregarHls ??= import("hls.js").then((m) => m.default));

// Vídeo do trailer da Steam. Sem controles = prévia muda em loop (hover de cards e destaques).
// inicio: segundos a pular (abertura com logos de estúdio), só se o vídeo for longo o bastante.
function Trailer({ jogo, controles = false, mudo = true, inicio = 0, className = "", aoTerminar, aoComecar }) {
    const videoRef = useRef(null);
    const [pronto, setPronto] = useState(false);
    const trailer = trailerDoJogo(jogo);
    const fonte = trailer?.hls;

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !fonte) return;
        let hls = null;
        let cancelado = false;

        // O player completo usa HLS nativo quando existe; as prévias sempre passam pelo hls.js,
        // que limita a qualidade ao tamanho do card (o nativo do Chrome baixaria 1080p).
        const nativo = video.canPlayType("application/vnd.apple.mpegurl") !== "";
        if (nativo && controles) {
            video.src = fonte;
        } else {
            obterHls().then((Hls) => {
                if (cancelado) return;
                if (!Hls.isSupported()) {
                    if (nativo) video.src = fonte;
                    return;
                }
                // Prévias começam na qualidade mais leve; o player escolhe pelo tamanho na tela.
                hls = new Hls({ capLevelToPlayerSize: true, startLevel: controles ? -1 : 0, maxBufferLength: controles ? 30 : 8 });
                hls.loadSource(fonte);
                hls.attachMedia(video);
            });
        }

        return () => {
            cancelado = true;
            hls?.destroy();
            video.removeAttribute("src");
            video.load();
        };
    }, [fonte, controles]);

    if (!trailer) return null;

    return (
        <video
            ref={videoRef}
            className={`trailer ${pronto ? "pronto" : ""} ${className}`}
            poster={controles ? trailer.poster : undefined}
            muted={mudo}
            autoPlay
            playsInline
            loop={!controles}
            controls={controles}
            preload="auto"
            onPlaying={() => {
                setPronto(true);
                aoComecar?.();
            }}
            onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                if (inicio && video.duration > inicio * 3) video.currentTime = inicio;
            }}
            onEnded={aoTerminar}
            aria-label={`Trailer de ${jogo.nome}`}
        />
    );
}

export default Trailer;
