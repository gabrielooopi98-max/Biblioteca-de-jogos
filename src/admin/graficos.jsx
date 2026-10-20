// Gráficos do painel em SVG puro (sem biblioteca): área com dica ao passar o mouse, rosca e barras.
import { useEffect, useRef, useState } from "react";
import { formatarPreco } from "../utils.js";
import { CORES, moedaCurta } from "./vendas.js";

function useLargura() {
    const ref = useRef(null);
    const [largura, setLargura] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observador = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)));
        observador.observe(el);
        return () => observador.disconnect();
    }, []);
    return [ref, largura];
}

// teto "redondo" para o eixo (1, 2, 2,5 ou 5 × 10^n)
function tetoRedondo(v) {
    if (v <= 0) return 25;
    const base = 10 ** Math.floor(Math.log10(v));
    return [1, 2, 2.5, 5, 10].map((m) => m * base).find((m) => m >= v);
}

export function GraficoArea({ pontos, rotuloX, rotuloDica, altura = 240, vazio }) {
    const [ref, largura] = useLargura();
    const [foco, setFoco] = useState(null);
    const margem = { topo: 12, dir: 12, base: 28, esq: 64 };
    const w = Math.max(largura - margem.esq - margem.dir, 10);
    const h = altura - margem.topo - margem.base;
    const degrau = tetoRedondo(Math.max(...pontos.map((p) => p.valor), 0) / 4);
    const maximo = degrau * 4;
    const x = (i) => margem.esq + (pontos.length > 1 ? (i / (pontos.length - 1)) * w : w / 2);
    const y = (v) => margem.topo + h - (v / maximo) * h;
    const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join("");
    const area = `${linha}L${x(pontos.length - 1).toFixed(1)},${margem.topo + h}L${x(0).toFixed(1)},${margem.topo + h}Z`;
    const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximo);
    const passo = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor(w / 70))));
    // rótulo do eixo X a cada "passo" e sempre o último, sem encostar no penúltimo
    const temRotulo = (i) => i === pontos.length - 1 || (i % passo === 0 && pontos.length - 1 - i >= passo * 0.7);

    function mover(e) {
        const caixa = e.currentTarget.getBoundingClientRect();
        const rel = (e.clientX - caixa.left - margem.esq) / w;
        setFoco(Math.min(pontos.length - 1, Math.max(0, Math.round(rel * (pontos.length - 1)))));
    }

    const p = foco != null ? pontos[foco] : null;
    return (
        <div className="a-grafico" ref={ref} style={{ height: altura }}>
            {largura > 0 && (
                <svg width={largura} height={altura} onPointerMove={mover} onPointerLeave={() => setFoco(null)} role="img" aria-label="Gráfico de receita no período">
                    <defs>
                        <linearGradient id="a-grad-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#ecb621" stopOpacity="0.32" />
                            <stop offset="100%" stopColor="#ecb621" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {marcas.map((m) => (
                        <g key={m}>
                            <line x1={margem.esq} x2={margem.esq + w} y1={y(m)} y2={y(m)} className="a-grafico-grade" />
                            <text x={margem.esq - 10} y={y(m)} className="a-grafico-eixo" textAnchor="end" dominantBaseline="middle">
                                {moedaCurta(m)}
                            </text>
                        </g>
                    ))}
                    {pontos.map((pt, i) =>
                        temRotulo(i) ? (
                            <text key={i} x={x(i)} y={altura - 8} className="a-grafico-eixo" textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}>
                                {rotuloX(pt)}
                            </text>
                        ) : null,
                    )}
                    <path d={area} fill="url(#a-grad-area)" />
                    <path d={linha} fill="none" stroke="#ecb621" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                    {p && (
                        <g>
                            <line x1={x(foco)} x2={x(foco)} y1={margem.topo} y2={margem.topo + h} className="a-grafico-guia" />
                            <circle cx={x(foco)} cy={y(p.valor)} r="5" fill="#ecb621" strokeWidth="2.5" style={{ stroke: "var(--a-sup-1)" }} />
                        </g>
                    )}
                </svg>
            )}
            {p && (
                <div className="a-grafico-dica" style={{ left: Math.min(Math.max(x(foco), 90), largura - 90), top: Math.max(y(p.valor) - 12, 0) }}>
                    {rotuloDica(p)}
                </div>
            )}
            {vazio && <p className="a-grafico-vazio">{vazio}</p>}
        </div>
    );
}

// Rosca com o total no meio e legenda ao lado
export function GraficoRosca({ partes, centro, rotuloCentro, formatar = (v) => v }) {
    const total = partes.reduce((s, p) => s + p.valor, 0);
    const raio = 52;
    const circ = 2 * Math.PI * raio;
    let acumulado = 0;
    return (
        <div className="a-rosca">
            <svg viewBox="0 0 140 140" width="148" height="148" role="img" aria-label={partes.map((p) => `${p.rotulo}: ${formatar(p.valor)}`).join(", ")}>
                <circle cx="70" cy="70" r={raio} fill="none" stroke="var(--a-sup-3)" strokeWidth="16" />
                {total > 0 &&
                    partes.map((p, i) => {
                        const fatia = (p.valor / total) * circ;
                        const el = (
                            <circle
                                key={p.rotulo}
                                cx="70"
                                cy="70"
                                r={raio}
                                fill="none"
                                stroke={p.cor || CORES[i % CORES.length]}
                                strokeWidth="16"
                                strokeDasharray={`${Math.max(fatia - 2, 0.01)} ${circ}`}
                                strokeDashoffset={-acumulado}
                                transform="rotate(-90 70 70)"
                            />
                        );
                        acumulado += fatia;
                        return el;
                    })}
                <text x="70" y="66" textAnchor="middle" className="a-rosca-valor">
                    {centro ?? total}
                </text>
                <text x="70" y="86" textAnchor="middle" className="a-rosca-rotulo">
                    {rotuloCentro}
                </text>
            </svg>
            <ul className="a-legenda">
                {partes.map((p, i) => (
                    <li key={p.rotulo}>
                        <span className="a-legenda-cor" style={{ background: p.cor || CORES[i % CORES.length] }} />
                        <span className="a-legenda-nome">{p.rotulo}</span>
                        <strong>{formatar(p.valor)}</strong>
                        <small>{total ? `${Math.round((p.valor / total) * 100)}%` : "0%"}</small>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Lista com barra proporcional (ranking)
export function Barras({ itens, formatar = formatarPreco }) {
    const maximo = Math.max(...itens.map((i) => i.valor), 0) || 1;
    return (
        <ol className="a-barras">
            {itens.map((item, i) => (
                <li key={item.chave ?? item.rotulo}>
                    <div className="a-barras-topo">
                        <span className="a-barras-nome">
                            {item.posicao && <em>{i + 1}</em>}
                            {item.href ? <a href={item.href}>{item.rotulo}</a> : item.rotulo}
                        </span>
                        <strong>{formatar(item.valor)}</strong>
                    </div>
                    <div className="a-barras-trilho">
                        <span style={{ width: `${(item.valor / maximo) * 100}%`, background: item.cor }} />
                    </div>
                    {item.detalhe && <small>{item.detalhe}</small>}
                </li>
            ))}
        </ol>
    );
}
