import { useEffect, useRef, useState } from "react";
import { trailerDoJogo } from "../utils.js";

// O hls.js só é baixado quando o primeiro trailer vai tocar (Safari toca HLS nativamente).
let carregarHls = null;
const obterHls = () => (carregarHls ??= import("hls.js").then((m) => m.default));

// Vídeo do trailer da Steam. Sem controles = prévia muda em loop (hover de cards e destaques).
// inicio: segundos a pular (abertura com logos de estúdio), só se o vídeo for longo o bastante.
// alturaMax: teto de qualidade (o fundo do banner é coberto por degradês; 1080p só pesaria).
function Trailer({ jogo, controles = false, mudo = true, inicio = 0, alturaMax = 0, className = "", aoTerminar, aoComecar }) {
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
                // maxBufferLength é só o mínimo: sem teto (maxMaxBufferLength) e com maxBufferSize de 60 MB,
                // o hls.js baixava 20 a 35 MB de cada prévia que aparece por 14 s. Prévias guardam no máximo 10 s.
                hls = new Hls(
                    controles
                        ? { capLevelToPlayerSize: true, maxBufferLength: 30, maxMaxBufferLength: 60 }
                        : { capLevelToPlayerSize: true, startLevel: 0, maxBufferLength: 6, maxMaxBufferLength: 10, maxBufferSize: 8 * 1024 * 1024 },
                );
                if (alturaMax) {
                    hls.on(Hls.Events.MANIFEST_PARSED, (_, dados) => {
                        const ate = dados.levels.reduce((melhor, nivel, i) => (nivel.height && nivel.height <= alturaMax ? i : melhor), 0);
                        hls.autoLevelCapping = ate;
                    });
                }
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
    }, [fonte, controles, alturaMax]);

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
