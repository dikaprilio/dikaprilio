// Everything the README says lives here. Edit this file, then run
// `node scripts/render.mjs` to redraw the cards and README.md.

export const profile = {
    name: "Dika Aprilio Wibowo",
    handle: "dikaprilio",
    role: "Product Engineer · Design Engineer",
    file: "dikaprilio.fig",
    status: "Open to work · Bogor, ID",

    // Lines typed under the name, one after another
    typing: [
        "I build products end to end, from problem to launch.",
        "Now: Product Engineering Intern at VecML.",
        "Leading GDGoC IPB: 1,600 to 3,800+ members in 5 months.",
        "AI-native by default: agents, MCP, RAG."
    ],

    chips: ["SE @ IPB University", "Djarum Scholar", "Co-founder, Omongin"],

    stats: [
        { value: "3", suffix: "×", label: "NATIONAL 1ST PLACE", caption: "Aksesin, kotahujan.id, Lokerin" },
        { value: "400", suffix: "+", label: "STUDENTS", caption: "on Omongin, which I co-founded" },
        { value: "7", suffix: "", label: "FEATURES SHIPPED", caption: "at VecML, with 5 engineers" },
        { value: "3,800", suffix: "+", label: "GDGOC MEMBERS", caption: "from 1,600 in 5 months" }
    ],

    // Selected work, one card each. `art` picks the little illustration.
    work: [
        {
            slug: "aksesin", name: "Aksesin", art: "pin",
            award: "1ST · IFEST NATIONAL HACKATHON 2026",
            blurb: "AI travel companion that lets people with disabilities check how accessible a place is, stage by stage, before they leave home.",
            facts: "229 places · SUS 80.65",
            stack: ["Expo", "Fastify", "PostGIS + pgvector", "Mastra agents"],
            link: "aksesin.onefatir.dev", href: "https://aksesin.onefatir.dev"
        },
        {
            slug: "kotahujan", name: "kotahujan.id", art: "rain",
            award: "1ST · NUSANTARA DIGITAL CITY 2026",
            blurb: "Digital city platform for Bogor: places, food, local businesses, events, BISKITA and angkot routes, and SundaQuest for learning Sundanese.",
            facts: "Solo build",
            stack: ["PostgreSQL", "Hybrid RAG", "MCP server", "GitHub Actions"],
            link: "kotahujan.id", href: "https://kotahujan.id"
        },
        {
            slug: "lokerin", name: "Lokerin", art: "mic",
            award: "1ST · ITASE 7.0 WEB DEVELOPMENT 2026",
            blurb: "Voice-first, agentic job platform: tell your story, get a CV built only from facts you confirmed, then matched openings.",
            facts: "Telkom University Purwokerto",
            stack: ["TypeScript", "AI agents", "Voice"],
            link: "lokerin-backend", href: "https://github.com/dikaprilio/lokerin-backend"
        },
        {
            slug: "omongin", name: "Omongin", art: "chat",
            award: "CO-FOUNDER · 400+ STUDENTS",
            blurb: "English-speaking platform that pairs live tutors with AI practice. I lead product and engineering. Now a registered company.",
            facts: "Since Oct 2025",
            stack: ["Next.js", "Supabase", "CRM automation"],
            link: "omongin.id", href: "https://omongin.id"
        }
    ],

    // Icons are keyed into scripts/data/icons.json; `mark` draws a lettermark instead
    stack: [
        { label: "LANGUAGES AND WEB", items: ["typescript", "javascript", "python", "nextdotjs", "react", "tailwindcss"] },
        { label: "MOBILE AND 3D", items: ["react:React Native", "expo", "threedotjs"] },
        { label: "BACKEND AND DATA", items: ["fastify", "drizzle", "postgresql", "convex", "supabase"] },
        { label: "DESIGN AND SHIP", items: ["figma", "mark:Ai:Illustrator", "vercel", "githubactions", "git"] }
    ],
    ai: ["Claude Code", "Mastra agents", "MCP servers", "RAG on pgvector", "Voice and speech"],

    // Repositories to keep out of the activity card
    activity: { hide: [] },

    comms: [
        { slug: "linkedin", label: "LINKEDIN", value: "dikaaprilio", href: "https://linkedin.com/in/dikaaprilio" },
        { slug: "instagram", label: "INSTAGRAM", value: "@dikaaprilio.w", href: "https://instagram.com/dikaaprilio.w" },
        { slug: "gmail", label: "EMAIL", value: "apridika07@gmail.com", href: "mailto:apridika07@gmail.com" }
    ],

    sections: [
        { slug: "work", title: "Selected work", sub: "things I designed and built" },
        { slug: "stack", title: "Stack", sub: "what I build with" },
        { slug: "activity", title: "Version history", sub: "redrawn every night" },
        { slug: "comms", title: "Say hi", sub: "DMs are open" }
    ]
}
