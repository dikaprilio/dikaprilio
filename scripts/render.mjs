// Draws every card in assets/ (and the nightly activity card in live/) from
// scripts/data/profile.mjs, then writes README.md. Run: node scripts/render.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { profile as P } from "./data/profile.mjs"
import { themes, esc, measure, fit, wrap, text, r, doc, card, pill, icon, icons, cursor, dotPattern } from "./lib/kit.mjs"

const titles = Object.fromEntries(Object.entries(icons).map(([k, v]) => [k, v.title]))

const root = new URL("../", import.meta.url)
const out = (p) => new URL(p, root)
mkdirSync(out("assets"), { recursive: true })
mkdirSync(out("live"), { recursive: true })
const avatar = readFileSync(new URL("./data/avatar.png", import.meta.url)).toString("base64")
const activityFile = new URL("./data/activity.json", import.meta.url)
const activity = existsSync(activityFile) ? JSON.parse(readFileSync(activityFile)) : null
const RAW = `https://raw.githubusercontent.com/${P.handle}/${P.handle}/output`

const written = []
function save(dir, name, svg) {
    writeFileSync(out(`${dir}/${name}.svg`), svg)
    written.push(`${dir}/${name}.svg`)
}

// ─── Typing line ────────────────────────────────────────────────────────────
// Each line is revealed by a clip rect whose width steps through the measured
// width of every prefix; a caret follows the same steps.
function typing(lines, { size, weight = 500, fill, caret, xFor, y, idBase, h = size + 8 }) {
    const perChar = 0.05, hold = 2.6, gap = 0.35
    const slots = []
    let tcur = 0
    for (const line of lines) {
        const n = [...line].length
        slots.push({ line, start: tcur, n })
        tcur += n * perChar + hold + gap
    }
    const T = tcur
    const kt = (s) => Math.min(1, Math.max(0, s / T)).toFixed(5)
    let body = ""
    let defs = ""
    const caretFrames = [[0, xFor(slots[0].line)]]
    slots.forEach((s, i) => {
        const chars = [...s.line]
        const x0 = xFor(s.line)
        const frames = [[0, 0]]
        if (s.start > 0) frames.push([s.start, 0])
        for (let k = 1; k <= chars.length; k++) {
            const w = measure(chars.slice(0, k).join(""), size, weight)
            frames.push([s.start + k * perChar, w])
            caretFrames.push([s.start + k * perChar, x0 + w + 2])
        }
        const end = s.start + chars.length * perChar + hold
        frames.push([end, 0])
        if (i + 1 < slots.length) caretFrames.push([end, xFor(slots[i + 1].line)])
        else caretFrames.push([end, xFor(slots[0].line)])
        if (end < T) frames.push([T, 0])
        const values = frames.map((f) => r(f[1])).join(";")
        const times = frames.map((f) => kt(f[0])).join(";")
        const id = `${idBase}${i}`
        defs += `<clipPath id="${id}"><rect x="${r(x0)}" y="${y - size}" width="0" height="${h}"><animate attributeName="width" calcMode="discrete" values="${values}" keyTimes="${times}" dur="${T.toFixed(2)}s" repeatCount="indefinite"/></rect></clipPath>`
        body += `<g clip-path="url(#${id})">${text(x0, y, s.line, { size, weight, fill })}</g>`
    })
    if (caretFrames[caretFrames.length - 1][0] < T) caretFrames.push([T, caretFrames[caretFrames.length - 1][1]])
    // keyTimes must start at 0 and increase
    const cf = caretFrames.filter((f, i, a) => i === 0 || f[0] > a[i - 1][0])
    if (cf[cf.length - 1][0] !== T) cf.push([T, cf[cf.length - 1][1]])
    body += `<rect x="0" y="${y - size * 0.82}" width="2" height="${r(size * 1.05)}" rx="1" fill="${caret}"><animate attributeName="x" calcMode="discrete" values="${cf.map((f) => r(f[1])).join(";")}" keyTimes="${cf.map((f) => kt(f[0])).join(";")}" dur="${T.toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1s" repeatCount="indefinite"/></rect>`
    return { body, defs }
}

// Selection box with handles, the way a design tool shows a selected layer
function selection(x, y, w, h, t, owner) {
    const hs = 7
    const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
    const tagW = measure(owner, 10.5, 700) + 12
    return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="none" stroke="${t.blue}" stroke-width="1.5"/>` +
        corners.map(([cx, cy]) => `<rect x="${r(cx - hs / 2)}" y="${r(cy - hs / 2)}" width="${hs}" height="${hs}" fill="${t.bg}" stroke="${t.blue}" stroke-width="1.5"/>`).join("") +
        `<rect x="${r(x - 0.75)}" y="${r(y - 21)}" width="${r(tagW)}" height="18" rx="3" fill="${t.blue}"/>` +
        text(x + 5.25, y - 8, owner, { size: 10.5, weight: 700, fill: "#FFFFFF" })
}

function avatarDisc(cx, cy, rad, t, id) {
    // The cutout is 300x254; the face sits about 45% across and 32% down
    const iw = rad * 2.55, ih = iw * 254 / 300
    const ix = cx - iw * 0.47, iy = cy - ih * 0.36
    return {
        defs: `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${rad}"/></clipPath>`,
        svg: `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${t.blue}"/>` +
            `<circle cx="${cx}" cy="${cy}" r="${rad - 10}" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="3 6"/>` +
            `<g clip-path="url(#${id})"><image x="${r(ix)}" y="${r(iy)}" width="${r(iw)}" height="${r(ih)}" href="data:image/png;base64,${avatar}"/></g>`
    }
}

function tag(str, x, y, rot, size, t) {
    const w = measure(str, size, 800) + size * 0.9
    const h = size * 1.45
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="0" y="0" width="${r(w)}" height="${r(h)}" rx="${r(h * 0.22)}" fill="${t.blue}" stroke="#FFFFFF" stroke-width="2"/>` +
        text(size * 0.45, h * 0.73, str, { size, weight: 800, fill: "#FFFFFF" }) + `</g>`
}

function chipsRow(items, t, { x, y, maxW, center = false, size = 11.5, gap = 8 }) {
    // Lay chips out in rows that fit maxW
    const rows = [[]]
    let used = 0
    for (const it of items) {
        const w = measure(it, size, 700, 0.2) + 24
        if (rows[rows.length - 1].length && used + gap + w > maxW) { rows.push([]); used = 0 }
        rows[rows.length - 1].push({ it, w })
        used += (rows[rows.length - 1].length > 1 ? gap : 0) + w
    }
    let svg = ""
    rows.forEach((row, ri) => {
        const total = row.reduce((a, c) => a + c.w, 0) + gap * (row.length - 1)
        let cx = center ? x - total / 2 : x
        for (const c of row) {
            svg += pill(cx, y + ri * 32, c.it, t, { size, weight: 700, tracking: 0.2, padX: 12, h: 26 }).svg
            cx += c.w + gap
        }
    })
    return { svg, rows: rows.length }
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function hero(t, mobile) {
    const W = mobile ? 400 : 800
    const H = mobile ? 440 : 300
    let defs = dotPattern("dots", t)
    let body = card(0, 0, W, H, t, 22) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="21" fill="url(#dots)"/>`

    // Top bar: the file name, and a live status on the right
    const pad = mobile ? 20 : 28
    body += `<rect x="${pad}" y="25" width="9" height="9" rx="2" fill="${t.blue}"/>`
    body += text(pad + 16, 33.5, `${P.file}  /  Frame 1`, { size: 11, weight: 700, fill: t.sub, tracking: 0.6 })
    const status = mobile ? "Bogor, ID" : P.status
    const sw = measure(status, 11, 700, 0.3)
    body += `<circle cx="${r(W - pad - sw - 11)}" cy="29.5" r="4" fill="${t.mint}"><animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite"/></circle>`
    body += text(W - pad, 33.5, status, { size: 11, weight: 700, fill: t.sub, anchor: "end", tracking: 0.3 })
    body += `<line x1="${pad}" y1="50" x2="${W - pad}" y2="50" stroke="${t.line}"/>`

    // Avatar with the two tags from the portfolio
    const av = mobile ? { cx: 200, cy: 148, rad: 76 } : { cx: 150, cy: 172, rad: 86 }
    const disc = avatarDisc(av.cx, av.cy, av.rad, t, "av")
    defs += disc.defs
    body += disc.svg
    body += tag("Hey!", av.cx + av.rad * 0.45, av.cy - av.rad * 1.02, -8, mobile ? 17 : 19, t)
    body += tag("it’s Dika!", av.cx - av.rad * 1.12, av.cy + av.rad * 0.62, -6, mobile ? 15 : 16, t)

    // Name inside a selection box
    const tx = mobile ? W / 2 : 284
    const maxName = mobile ? W - 48 : W - tx - 40
    const ns = fit(P.name, mobile ? 30 : 40, 800, maxName)
    const ny = mobile ? 290 : 122
    const nw = measure(P.name, ns, 800)
    const nx = mobile ? tx - nw / 2 : tx
    body += text(nx, ny, P.name, { size: ns, weight: 800, fill: t.ink, tracking: -0.4 })
    const bx = nx - 9, by = ny - ns * 0.8 - 7, bw = nw + 16, bh = ns * 1.05 + 14
    body += selection(bx, by, bw, bh, t, "Dika")

    // Role, then the typing line
    const rs = mobile ? 14.5 : 17
    body += text(mobile ? W / 2 : tx, ny + (mobile ? 34 : 44), P.role, { size: rs, weight: 700, fill: t.blueText, anchor: mobile ? "middle" : undefined })
    const typeMax = mobile ? W - 40 : W - tx - 30
    const ts = Math.min(...P.typing.map((l) => fit(l, mobile ? 13.5 : 15, 500, typeMax)))
    const ty = ny + (mobile ? 64 : 80)
    const tp = typing(P.typing, {
        size: ts, fill: t.sub, caret: t.blue, y: ty, idBase: "ty",
        xFor: (line) => (mobile ? W / 2 - measure(line, ts, 500) / 2 : tx)
    })
    defs += tp.defs
    body += tp.body

    // Chips
    const ch = chipsRow(P.chips, t, mobile
        ? { x: W / 2, y: ty + 22, maxW: W - 40, center: true, size: 11 }
        : { x: tx, y: ty + 28, maxW: W - tx - 28 })
    body += ch.svg

    // Two cursors share the file: Dika resizing his name, Claude wandering around
    const dk = mobile ? [bx + bw - 4, by + bh + 2] : [bx + bw - 4, by + bh + 2]
    body += `<g transform="translate(${r(dk[0])} ${r(dk[1])})"><g>${cursor("Dika", t.blue)}<animateTransform attributeName="transform" type="translate" values="0 0;6 4;0 0" dur="3.2s" repeatCount="indefinite"/></g></g>`
    const cl = mobile
        ? "M300 60 C 360 110, 360 200, 300 230 C 240 250, 70 250, 60 200 C 50 150, 230 40, 300 60 Z"
        : "M640 230 C 720 210, 770 150, 730 90 C 690 50, 560 60, 520 170 C 500 230, 580 250, 640 230 Z"
    body += `<g>${cursor("Claude", t.claude)}<animateMotion path="${cl}" dur="16s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyPoints="0;0.5;1"/></g>`

    return doc({ w: W, h: H, title: `${P.name}: ${P.role}`, body, defs })
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function stats(t, mobile) {
    const W = mobile ? 400 : 800
    const cols = mobile ? 2 : 4
    const gap = mobile ? 12 : 16
    const cw = (W - gap * (cols - 1)) / cols
    const chh = 118
    const rows = Math.ceil(P.stats.length / cols)
    const H = rows * chh + (rows - 1) * gap
    let body = ""
    P.stats.forEach((s, i) => {
        const x = (i % cols) * (cw + gap)
        const y = Math.floor(i / cols) * (chh + gap)
        body += card(x, y, cw, chh, t, 16)
        body += text(x + 18, y + 30, s.label, { size: 10, weight: 800, fill: t.blueText, tracking: 1 })
        // A small component mark, as a nod to design files
        const dx = x + cw - 24, dy = y + 25
        body += `<path d="M${dx} ${dy - 5} L${dx + 5} ${dy} L${dx} ${dy + 5} L${dx - 5} ${dy} Z" fill="none" stroke="${t.blue}" stroke-width="1.5"/>`
        const vs = fit(s.value + s.suffix, 36, 800, cw - 36)
        body += text(x + 18, y + 78, s.value, { size: vs, weight: 800, fill: t.ink, tracking: -0.6 })
        if (s.suffix) body += text(x + 18 + measure(s.value, vs, 800, -0.6) + 1, y + 78, s.suffix, { size: vs, weight: 800, fill: t.blue })
        body += text(x + 18, y + 101, s.caption, { size: fit(s.caption, 12, 500, cw - 32), weight: 500, fill: t.sub })
    })
    return doc({ w: W, h: H, title: "In numbers: " + P.stats.map((s) => `${s.value}${s.suffix} ${s.label.toLowerCase()}, ${s.caption}`).join("; "), body })
}

// ─── Section headers ────────────────────────────────────────────────────────
function header(sec, i, t, mobile) {
    const W = mobile ? 400 : 800
    const H = 60
    const num = String(i + 1).padStart(2, "0")
    let body = `<rect x="0" y="18" width="36" height="26" rx="8" fill="${t.blue}"/>` +
        text(18, 36, num, { size: 12, weight: 800, fill: "#FFFFFF", anchor: "middle", tracking: 0.5 })
    const ts = mobile ? 19 : 22
    body += text(48, 39, sec.title, { size: ts, weight: 800, fill: t.ink, tracking: -0.3 })
    let x = 48 + measure(sec.title, ts, 800, -0.3) + 12
    const ss = mobile ? 12 : 13.5
    if (x + measure(sec.sub, ss, 500) < W - 16) {
        body += text(x, 39, sec.sub, { size: ss, weight: 500, fill: t.sub })
        x += measure(sec.sub, ss, 500) + 14
    }
    if (x < W - 8) body += `<line x1="${r(x)}" y1="33" x2="${W}" y2="33" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round"/>`
    return doc({ w: W, h: H, title: `${num} · ${sec.title}: ${sec.sub}`, body })
}

// ─── Work cards ─────────────────────────────────────────────────────────────
function art(kind, cx, cy, s, t) {
    const g = (inner) => `<g transform="translate(${r(cx)} ${r(cy)}) scale(${s})">${inner}</g>`
    if (kind === "pin") return g(
        `<path d="M-62 30 C -30 10, -10 40, 20 18 S 50 -10, 64 -2" fill="none" stroke="${t.blue}" stroke-opacity="0.35" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>` +
        `<g><path d="M0 -34 C19 -34 31 -21 31 -3 C31 19 0 42 0 42 C0 42 -31 19 -31 -3 C-31 -21 -19 -34 0 -34 Z" fill="${t.blue}"/>` +
        `<circle cx="0" cy="-4" r="13" fill="#FFFFFF"/><circle cx="0" cy="-10" r="2.6" fill="${t.blue}"/>` +
        `<path d="M-5 -5 L5 -5 M0 -6 L0 2 L-4 8 M0 2 L4 8" stroke="${t.blue}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="2.6s" repeatCount="indefinite"/></g>` +
        `<ellipse cx="0" cy="46" rx="14" ry="3.5" fill="${t.blue}" fill-opacity="0.18"/>`)
    if (kind === "rain") {
        let drops = ""
        for (let i = 0; i < 5; i++) {
            const x = -28 + i * 14
            drops += `<line x1="${x}" y1="14" x2="${x - 4}" y2="26" stroke="${i % 2 ? t.mint : t.blue}" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;-3 16" dur="1.1s" begin="${(i * 0.21).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.1s" begin="${(i * 0.21).toFixed(2)}s" repeatCount="indefinite"/></line>`
        }
        return g(`<path d="M-40 8 C -54 8, -56 -14, -40 -16 C -38 -34, -12 -40, -2 -26 C 8 -40, 36 -36, 36 -16 C 52 -16, 54 8, 38 8 Z" fill="${t.blue}"/>` + drops)
    }
    if (kind === "mic") {
        let waves = ""
        ;[22, 34].forEach((rad, i) => {
            waves += `<path d="M${rad} -16 A ${rad} ${rad} 0 0 1 ${rad} 12" fill="none" stroke="${t.mint}" stroke-width="3" stroke-linecap="round" transform="translate(4 0)"><animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${i * 0.3}s" repeatCount="indefinite"/></path>`
            waves += `<path d="M${-rad} -16 A ${rad} ${rad} 0 0 0 ${-rad} 12" fill="none" stroke="${t.mint}" stroke-width="3" stroke-linecap="round" transform="translate(-4 0)"><animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${i * 0.3}s" repeatCount="indefinite"/></path>`
        })
        return g(`<rect x="-12" y="-36" width="24" height="42" rx="12" fill="${t.blue}"/>` +
            `<path d="M-20 -4 C -20 18, 20 18, 20 -4" fill="none" stroke="${t.blue}" stroke-width="3.5" stroke-linecap="round"/>` +
            `<line x1="0" y1="14" x2="0" y2="28" stroke="${t.blue}" stroke-width="3.5" stroke-linecap="round"/><line x1="-12" y1="29" x2="12" y2="29" stroke="${t.blue}" stroke-width="3.5" stroke-linecap="round"/>` + waves)
    }
    // chat
    return g(`<g><rect x="-58" y="-34" width="74" height="34" rx="12" fill="${t.blue}"/><path d="M-44 -2 L-48 10 L-34 -1 Z" fill="${t.blue}"/>` +
        `<text x="-21" y="-12" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle">Hello!</text>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.8s" repeatCount="indefinite"/></g>` +
        `<g><rect x="-10" y="8" width="68" height="32" rx="12" fill="${t.bg}" stroke="${t.blue}" stroke-width="2"/><path d="M42 39 L48 50 L32 40 Z" fill="${t.bg}" stroke="${t.blue}" stroke-width="2" stroke-linejoin="round"/>` +
        `<rect x="30" y="35" width="16" height="5" fill="${t.bg}"/>` +
        `<text x="24" y="29" font-size="14" font-weight="800" fill="${t.blueText}" text-anchor="middle">Halo!</text>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 0" dur="2.8s" repeatCount="indefinite"/></g>`)
}

function work(p, t, mobile) {
    const W = mobile ? 400 : 800
    let body = ""
    let H
    if (!mobile) {
        const cx = 216, maxW = W - cx - 26
        const lines = wrap(p.blurb, 14, 500, maxW).slice(0, 2)
        H = 168
        body += card(0, 0, W, H, t, 20)
        body += `<rect x="16" y="16" width="180" height="${H - 32}" rx="14" fill="${t.tint}"/>`
        body += art(p.art, 106, H / 2, 1, t)
        body += pill(cx, 18, p.award, t, { size: 10, weight: 800, tracking: 0.9, padX: 10, h: 22, fill: t.blue, color: "#FFFFFF" }).svg
        body += text(cx, 72, p.name, { size: 24, weight: 800, fill: t.ink, tracking: -0.4 })
        body += text(cx + measure(p.name, 24, 800, -0.4) + 12, 71, p.facts, { size: 12, weight: 700, fill: t.sub })
        lines.forEach((l, i) => { body += text(cx, 98 + i * 20, l, { size: 14, weight: 500, fill: t.sub }) })
        const linkTxt = `${p.link} ↗`
        const lw = measure(linkTxt, 12.5, 800)
        body += text(W - 24, 147, linkTxt, { size: 12.5, weight: 800, fill: t.blueText, anchor: "end" })
        let x = cx
        for (const s of p.stack) {
            const w = measure(s, 11, 700) + 20
            if (x + w > W - 24 - lw - 16) break
            body += pill(x, 130, s, t, { size: 11, weight: 700, tracking: 0, padX: 10, h: 24 }).svg
            x += w + 6
        }
    } else {
        const pad = 18, maxW = W - pad * 2
        const lines = wrap(p.blurb, 13.5, 500, maxW).slice(0, 4)
        const chips = []
        let x = pad, row = 0
        for (const s of p.stack) {
            const w = measure(s, 11, 700) + 20
            if (x + w > W - pad) { row++; x = pad }
            chips.push({ s, x, row })
            x += w + 6
        }
        const blurbY = 208
        const chipY = blurbY + lines.length * 19 + 8
        H = chipY + (row + 1) * 30 + 34
        body += card(0, 0, W, H, t, 20)
        body += `<rect x="12" y="12" width="${W - 24}" height="104" rx="14" fill="${t.tint}"/>`
        body += art(p.art, W / 2, 64, 0.85, t)
        body += pill(pad, 128, p.award, t, { size: fit(p.award, 9.5, 800, maxW - 20, 8, 0.8), weight: 800, tracking: 0.8, padX: 10, h: 22, fill: t.blue, color: "#FFFFFF" }).svg
        body += text(pad, 178, p.name, { size: 22, weight: 800, fill: t.ink, tracking: -0.4 })
        body += text(W - pad, 177, p.facts, { size: fit(p.facts, 11.5, 700, maxW - measure(p.name, 22, 800) - 16, 8), weight: 700, fill: t.sub, anchor: "end" })
        lines.forEach((l, i) => { body += text(pad, blurbY - 6 + i * 19, l, { size: 13.5, weight: 500, fill: t.sub }) })
        for (const c of chips) body += pill(c.x, chipY + c.row * 30, c.s, t, { size: 11, weight: 700, tracking: 0, padX: 10, h: 24 }).svg
        body += text(pad, H - 16, `${p.link} ↗`, { size: 12.5, weight: 800, fill: t.blueText })
    }
    return doc({ w: W, h: H, title: `${p.name}: ${p.award.toLowerCase()}. ${p.blurb}`, body })
}

// ─── Stack ──────────────────────────────────────────────────────────────────
function stack(t, mobile) {
    const W = mobile ? 400 : 800
    const pad = mobile ? 20 : 26
    const colW = mobile ? W - pad * 2 : (W - pad * 2 - 40) / 2
    const tile = 48
    const perRow = 6
    const step = (colW - tile) / (perRow - 1)
    const groupH = 24 + tile + 26
    let body = ""
    const total = P.stack.reduce((a, g) => a + g.items.length, 0)
    body += text(pad, 34, `INVENTORY · ${total} TOOLS EQUIPPED`, { size: 10.5, weight: 800, fill: t.blueText, tracking: 1 })
    if (!mobile) body += text(W - pad, 34, "AI-NATIVE BY DEFAULT", { size: 10.5, weight: 800, fill: t.sub, anchor: "end", tracking: 1 })
    let top = 58
    P.stack.forEach((grp, gi) => {
        const col = mobile ? 0 : gi % 2
        const rowI = mobile ? gi : Math.floor(gi / 2)
        const x0 = pad + col * (colW + 40)
        const y0 = top + rowI * (groupH + 16)
        body += `<rect x="${x0}" y="${y0 - 8}" width="6" height="6" rx="1.5" fill="${t.blue}"/>`
        body += text(x0 + 13, y0 - 1.5, grp.label, { size: 10, weight: 800, fill: t.ink, tracking: 0.9 })
        grp.items.forEach((item, ii) => {
            const tx = x0 + ii * step, ty = y0 + 12
            const [kind, a, b] = item.split(":")
            body += `<rect x="${r(tx)}" y="${ty}" width="${tile}" height="${tile}" rx="12" fill="${t.tint}"/>`
            let label
            if (kind === "mark") {
                body += text(tx + tile / 2, ty + tile / 2 + 6.5, a, { size: 18, weight: 800, fill: t.blueText, anchor: "middle" })
                label = b
            } else {
                body += icon(kind, tx + 12, ty + 12, 24, t.blueText)
                label = a ?? titles[kind] ?? kind
            }
            body += text(tx + tile / 2, ty + tile + 16, label, { size: fit(label, 10, 700, step + 6, 7.5), weight: 700, fill: t.sub, anchor: "middle" })
        })
    })
    const groupRows = mobile ? P.stack.length : Math.ceil(P.stack.length / 2)
    let y = top + groupRows * (groupH + 16) + 6
    body += `<rect x="${pad}" y="${y - 8}" width="6" height="6" rx="1.5" fill="${t.mint}"/>`
    body += text(pad + 13, y - 1.5, "APPLIED AI", { size: 10, weight: 800, fill: t.ink, tracking: 0.9 })
    const ch = chipsRow(P.ai, t, { x: pad, y: y + 10, maxW: W - pad * 2, size: 11.5 })
    body += ch.svg
    const H = y + 10 + ch.rows * 32 + 18
    return doc({
        w: W, h: H, title: "Stack: " + P.stack.map((g) => `${g.label.toLowerCase()}: ${g.items.map((i) => { const [k, a, b] = i.split(":"); return k === "mark" ? b : (a ?? titles[k] ?? k) }).join(", ")}`).join("; ") + "; applied AI: " + P.ai.join(", "),
        body: card(0, 0, W, H, t, 22) + body
    })
}

// ─── Activity ───────────────────────────────────────────────────────────────
function activityCard(t, mobile) {
    const W = mobile ? 400 : 800
    const weeksShown = mobile ? 26 : 53
    const cell = 11, gapC = 3, step = cell + gapC
    const days = activity?.days ?? []
    // Columns start on Sunday, like GitHub's own calendar
    const first = days.length ? new Date(days[0][0] + "T00:00:00Z").getUTCDay() : 0
    const cols = []
    days.forEach(([date, n], i) => {
        const c = Math.floor((i + first) / 7)
        ;(cols[c] ??= [])[(i + first) % 7] = { date, n }
    })
    const shown = cols.slice(-weeksShown)
    const nz = days.map((d) => d[1]).filter((n) => n > 0).sort((a, b) => a - b)
    const q = (p) => nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] : 1
    const th = [q(0.25), q(0.5), q(0.75)]
    const lvl = (n) => (n === 0 ? -1 : n <= th[0] ? 0 : n <= th[1] ? 1 : n <= th[2] ? 2 : 3)

    const gridW = weeksShown * step - gapC
    const x0 = (W - gridW) / 2, y0 = 58
    let body = text(x0, 36, mobile ? "LAST 6 MONTHS" : "LAST 12 MONTHS", { size: 10.5, weight: 800, fill: t.blueText, tracking: 1 })
    body += text(x0 + gridW, 36, `redrawn ${activity?.updated ?? "nightly"}`, { size: 11, weight: 700, fill: t.sub, anchor: "end" })
    let lastMonth = -1
    let lastLabelCol = -9
    shown.forEach((col, ci) => {
        for (let d = 0; d < 7; d++) {
            const cellD = col?.[d]
            if (!cellD) continue
            const l = lvl(cellD.n)
            const fill = l < 0 ? t.cellEmpty : t.heat[l]
            const x = x0 + ci * step, y = y0 + d * step
            body += `<rect x="${r(x)}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}"/>`
        }
        const firstDay = col?.find(Boolean)
        if (firstDay) {
            const m = new Date(firstDay.date + "T00:00:00Z").getUTCMonth()
            if (m !== lastMonth && ci < weeksShown - 2) {
                // Skip a label that would crowd the previous one
                if (ci - lastLabelCol >= 3) {
                    lastLabelCol = ci
                    body += text(x0 + ci * step, y0 + 7 * step + 12, new Date(firstDay.date).toLocaleString("en", { month: "short", timeZone: "UTC" }), { size: 9.5, weight: 700, fill: t.sub })
                }
                lastMonth = m
            }
        }
    })
    // Pulse on the latest day
    const lastCol = shown.length - 1
    const lastRow = shown[lastCol] ? shown[lastCol].length - 1 : 0
    if (lastCol >= 0) {
        const lx = x0 + lastCol * step + cell / 2, ly = y0 + lastRow * step + cell / 2
        body += `<circle cx="${r(lx)}" cy="${r(ly)}" r="6" fill="none" stroke="${t.mint}" stroke-width="2"><animate attributeName="r" values="5;11" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite"/></circle>`
    }

    // Numbers under the grid
    let longest = 0, cur = 0, active = 0
    for (const [, n] of days) { if (n > 0) { cur++; active++; longest = Math.max(longest, cur) } else cur = 0 }
    const top = activity?.repos?.[0]
    const blocks = [
        { v: (activity?.total ?? 0).toLocaleString("en"), l: "CONTRIBUTIONS" },
        { v: `${active}`, l: "ACTIVE DAYS" },
        { v: `${longest} days`, l: "LONGEST STREAK" },
        { v: top ? top.name : "-", l: top ? `MOST COMMITS · ${top.count}` : "MOST COMMITS" }
    ]
    const by = y0 + 7 * step + 30
    const bcols = mobile ? 2 : 4
    const bw = gridW / bcols
    blocks.forEach((b, i) => {
        const bx = x0 + (i % bcols) * bw
        const yy = by + Math.floor(i / bcols) * 58
        body += `<line x1="${r(bx)}" y1="${yy}" x2="${r(bx + bw - 14)}" y2="${yy}" stroke="${t.line}"/>`
        body += text(bx, yy + 30, b.v, { size: fit(b.v, 22, 800, bw - 18), weight: 800, fill: t.ink, tracking: -0.4 })
        body += text(bx, yy + 48, b.l, { size: fit(b.l, 10, 800, bw - 18, 7.5, 0.8), weight: 800, fill: t.blueText, tracking: 0.8 })
    })
    const H = by + Math.ceil(blocks.length / bcols) * 58 + 10
    return doc({
        w: W, h: H,
        title: `Version history: ${blocks.map((b) => `${b.v} ${b.l.toLowerCase()}`).join(", ")}, drawn from public GitHub activity every night`,
        body: card(0, 0, W, H, t, 22) + body
    })
}

// ─── Comms buttons ──────────────────────────────────────────────────────────
function comm(c, t) {
    const W = 250, H = 66
    let body = card(0, 0, W, H, t, 16)
    body += `<rect x="14" y="14" width="38" height="38" rx="11" fill="${t.blue}"/>`
    if (c.slug === "linkedin") body += text(33, 39.5, "in", { size: 17, weight: 800, fill: "#FFFFFF", anchor: "middle" })
    else body += icon(c.slug, 23, 23, 20, "#FFFFFF")
    body += text(64, 29, c.label, { size: 10, weight: 800, fill: t.blueText, tracking: 1 })
    body += text(64, 48, c.value, { size: fit(c.value, 13.5, 700, W - 64 - 30), weight: 700, fill: t.ink })
    body += `<path d="M${W - 26} 28 L${W - 18} 33 L${W - 26} 38" fill="none" stroke="${t.sub}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    return doc({ w: W, h: H, title: `${c.label}: ${c.value}`, body })
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function footer(t, mobile) {
    const W = mobile ? 400 : 800
    const H = mobile ? 92 : 78
    const line1 = "Thanks for scrolling. Designed and built end to end in Bogor."
    const s1 = fit(line1, 14.5, 700, W - 40)
    let body = text(W / 2, 34, line1, { size: s1, weight: 700, fill: t.ink, anchor: "middle" })
    const line2 = "Cards drawn by scripts/render.mjs · version history redrawn nightly"
    const s2 = fit(line2, 11.5, 500, W - 40, 9)
    body += text(W / 2, 56, line2, { size: s2, weight: 500, fill: t.sub, anchor: "middle" })
    const cx = W / 2 + measure(line1, s1, 700) / 2 + 6
    if (!mobile && cx < W - 60) body += `<g transform="translate(${r(cx)} 18)">${cursor("Dika", t.blue)}<animateTransform attributeName="transform" type="translate" values="${r(cx)} 18;${r(cx) + 4} 22;${r(cx)} 18" dur="3s" repeatCount="indefinite"/></g>`
    return doc({ w: W, h: H, title: `${line1} ${line2}`, body })
}

// ─── Draw everything ────────────────────────────────────────────────────────
for (const t of Object.values(themes)) {
    for (const mobile of [false, true]) {
        const sfx = `${t.name}${mobile ? "-mobile" : ""}`
        save("assets", `hero-${sfx}`, hero(t, mobile))
        save("assets", `stats-${sfx}`, stats(t, mobile))
        P.sections.forEach((s, i) => save("assets", `header-${s.slug}-${sfx}`, header(s, i, t, mobile)))
        P.work.forEach((p) => save("assets", `work-${p.slug}-${sfx}`, work(p, t, mobile)))
        save("assets", `stack-${sfx}`, stack(t, mobile))
        save("assets", `footer-${sfx}`, footer(t, mobile))
        save("live", `activity-${sfx}`, activityCard(t, mobile))
    }
    P.comms.forEach((c) => save("assets", `comm-${c.slug}-${t.name}`, comm(c, t)))
}

// ─── README ─────────────────────────────────────────────────────────────────
// Desktop and mobile, light and dark: the same <picture> for every card
const pic = (base, alt, { src = "assets", width = "100%" } = {}) =>
    `<picture><source media="(prefers-color-scheme: dark) and (min-width: 768px)" srcset="${src}/${base}-dark.svg" /><source media="(prefers-color-scheme: light) and (min-width: 768px)" srcset="${src}/${base}-light.svg" /><source media="(prefers-color-scheme: dark)" srcset="${src}/${base}-dark-mobile.svg" /><img src="${src}/${base}-light-mobile.svg" width="${width}" alt="${esc(alt)}" /></picture>`
const link = (href, inner) => `<a href="${esc(href)}">${inner}</a>`
const sec = (slug) => {
    const i = P.sections.findIndex((s) => s.slug === slug)
    const s = P.sections[i]
    return pic(`header-${slug}`, `${String(i + 1).padStart(2, "0")} · ${s.title}: ${s.sub}`)
}

const readme = `<!--
  Profile README for @${P.handle}, in the same brand as the feed:
  Manrope only, #2645F2 on white, a design-file canvas.
  Every card is drawn by scripts/render.mjs from scripts/data/profile.mjs.
  Edit the data, then run: node scripts/render.mjs
-->

${pic("hero", `${P.name}: ${P.role}. ${P.typing[0]}`)}

${pic("stats", "In numbers: " + P.stats.map((s) => `${s.value}${s.suffix} ${s.label.toLowerCase()} (${s.caption})`).join(", "))}

${sec("work")}

${P.work.map((p) => link(p.href, pic(`work-${p.slug}`, `${p.name}: ${p.award.toLowerCase()}. ${p.blurb}`))).join("\n\n")}

${sec("stack")}

${pic("stack", "Stack: TypeScript, Next.js, React, React Native, Expo, Fastify, Drizzle, PostgreSQL, Convex, Supabase, Figma, Vercel, GitHub Actions; applied AI: " + P.ai.join(", "))}

${sec("activity")}

${link(`https://github.com/${P.handle}`, pic("activity", "Version history: a year of GitHub contributions as a calendar, redrawn every night", { src: RAW }))}

${sec("comms")}

<p align="center">
${P.comms.map((c) => link(c.href, `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/comm-${c.slug}-dark.svg" /><img src="assets/comm-${c.slug}-light.svg" width="250" alt="${esc(`${c.label}: ${c.value}`)}" /></picture>`)).join("\n")}
</p>

${pic("footer", "Thanks for scrolling. Designed and built end to end in Bogor.")}
`
writeFileSync(out("README.md"), readme)
console.log(`drew ${written.length} cards and README.md`)
