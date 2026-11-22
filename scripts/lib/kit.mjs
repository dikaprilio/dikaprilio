// Shared pieces for every card: themes, Manrope, text measuring, small shapes.
import { readFileSync } from "node:fs"

const root = new URL("../", import.meta.url)
const metrics = JSON.parse(readFileSync(new URL("data/metrics.json", root)))
export const icons = JSON.parse(readFileSync(new URL("data/icons.json", root)))
const fontB64 = Object.fromEntries([500, 700, 800].map((w) =>
    [w, readFileSync(new URL(`fonts/manrope-${w}.woff2`, root)).toString("base64")]))

// Brand: white or #2645F2, Manrope only, mint accents, nothing black.
// Dark mode trades white for a deep blue so the cards still read as "ours".
export const themes = {
    light: {
        name: "light", bg: "#FFFFFF", line: "#E2E6F6", dot: "#DCE2FA", ink: "#1E1E1E", sub: "#5B6270",
        blue: "#2645F2", blueText: "#2645F2", tint: "#EEF1FE", onBlue: "#FFFFFF", mint: "#00B894",
        cellEmpty: "#EEF1FE", heat: ["#C7D0FC", "#8C9EF8", "#566FF5", "#2645F2"], claude: "#D97757"
    },
    dark: {
        name: "dark", bg: "#0F1648", line: "#26318A", dot: "#232E80", ink: "#F5F7FF", sub: "#AAB4EA",
        blue: "#2645F2", blueText: "#8A9CFF", tint: "#18225E", onBlue: "#FFFFFF", mint: "#2EE6BB",
        cellEmpty: "#18225E", heat: ["#26338F", "#3550C8", "#4F6BFF", "#93A5FF"], claude: "#E58A6A"
    }
}

export const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// Width of a string in px, from Manrope's real advance widths
export function measure(text, size, weight = 500, tracking = 0) {
    const m = metrics.weights[weight] ?? metrics.weights[500]
    let units = 0
    let n = 0
    for (const ch of String(text)) { units += m.adv[ch] ?? m.fallback; n++ }
    return (units / metrics.upm) * size + tracking * n
}

// Largest size (down to `min`) at which the text fits in `max` px
export function fit(text, size, weight, max, min = 10, tracking = 0) {
    let s = size
    while (s > min && measure(text, s, weight, tracking) > max) s -= 0.5
    return s
}

// Greedy word wrap by measured width
export function wrap(text, size, weight, max) {
    const lines = []
    let cur = ""
    for (const word of String(text).split(/\s+/)) {
        const next = cur ? `${cur} ${word}` : word
        if (cur && measure(next, size, weight) > max) { lines.push(cur); cur = word } else cur = next
    }
    if (cur) lines.push(cur)
    return lines
}

export function text(x, y, str, { size = 14, weight = 500, fill, anchor, tracking, extra = "" } = {}) {
    const a = anchor ? ` text-anchor="${anchor}"` : ""
    const t = tracking ? ` letter-spacing="${tracking}"` : ""
    return `<text x="${r(x)}" y="${r(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}"${a}${t}${extra}>${esc(str)}</text>`
}

export const r = (n) => Math.round(n * 100) / 100

// A full SVG document with the fonts it needs inlined
export function doc({ w, h, title, body, weights = [500, 700, 800], css = "", defs = "" }) {
    const faces = weights.map((wt) =>
        `@font-face{font-family:"Manrope";font-weight:${wt};src:url(data:font/woff2;base64,${fontB64[wt]}) format("woff2")}`).join("")
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${faces}text{font-family:"Manrope",ui-sans-serif,system-ui,sans-serif}${css}</style>
${defs ? `<defs>${defs}</defs>` : ""}
${body}
</svg>
`
}

// Rounded card with a hairline border
export const card = (x, y, w, h, t, rad = 18, fill) =>
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${rad}" fill="${fill ?? t.bg}" stroke="${t.line}"/>`

// Pill sized to its text
export function pill(x, y, str, t, { size = 11, weight = 800, tracking = 0.8, padX = 10, h = 24, fill, color, anchor = "start" } = {}) {
    const w = measure(str, size, weight, tracking) + padX * 2
    const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x
    return {
        w,
        svg: `<rect x="${r(x0)}" y="${y}" width="${r(w)}" height="${h}" rx="${h / 2}" fill="${fill ?? t.tint}"/>` +
            text(x0 + padX, y + h / 2 + size * 0.36, str, { size, weight, fill: color ?? t.blueText, tracking })
    }
}

// Brand icon from simple-icons (24x24 viewBox), drawn at `s` px
export function icon(slug, x, y, s, fill) {
    const ic = icons[slug]
    if (!ic) return ""
    return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s / 24)})"><path d="${ic.path}" fill="${fill}"/></g>`
}

// Multiplayer cursor with a name tag, pointing at (0,0)
export function cursor(name, color, { tagText = "#FFFFFF" } = {}) {
    const w = measure(name, 11, 700) + 14
    return `<path d="M0 0 L0 15.5 L4.2 11.6 L7.1 18 L9.6 16.9 L6.8 10.6 L12.3 10.4 Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<rect x="10" y="17" width="${r(w)}" height="20" rx="6" fill="${color}"/>` +
        text(17, 31, name, { size: 11, weight: 700, fill: tagText })
}

// Subtle dotted canvas, like an empty design file
export const dotPattern = (id, t, gap = 16) =>
    `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse"><circle cx="${gap / 2}" cy="${gap / 2}" r="1" fill="${t.dot}"/></pattern>`
