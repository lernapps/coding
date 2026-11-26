// Draws the command cards and the board for the unplugged start (public/karten/<lang>/), as A4 SVG pages that print in
// black and white: the same words as the blocks (src/messages/<lang>.json) and the same colours (a band on the left).
// Run after a change of the block texts: npm run build:cards. A test checks that the files are up to date.
/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const COLOURS = { move: "#2f5d8a", control: "#2e6b30", sense: "#6f3a96", start: "#7a4f24" } as const;
type Kind = keyof typeof COLOURS;
const SYMBOL: Record<Kind, string> = { move: "▶", control: "↻", sense: "?", start: "★" };

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Kiko, small, centred on (x, y), facing right. */
const kiko = (x: number, y: number, size: number): string => {
  const k = size / 44;
  return `<g transform="translate(${x} ${y}) scale(${k})"><circle r="19" fill="#fff" stroke="#1f2a44"/><line x1="0" y1="-11" x2="0" y2="-16" stroke="#5c2400" stroke-width="1.5"/><circle cy="-16.5" r="2" fill="#ffc300" stroke="#5c2400" stroke-width="0.8"/><rect x="-10" y="-11" width="20" height="13" rx="5" fill="#e8590c" stroke="#5c2400" stroke-width="1.2"/><rect x="-7" y="-8.5" width="14" height="7.5" rx="3" fill="#1f2a44"/><circle cx="-3.2" cy="-4.8" r="1.7" fill="#fff"/><circle cx="3.2" cy="-4.8" r="1.7" fill="#fff"/><rect x="-7.5" y="3" width="15" height="8" rx="3" fill="#e8590c" stroke="#5c2400" stroke-width="1.2"/><rect x="-8.5" y="11" width="6" height="3.5" rx="1.5" fill="#1f2a44"/><rect x="2.5" y="11" width="6" height="3.5" rx="1.5" fill="#1f2a44"/><path d="M 17 -7 L 26 0 L 17 7 Z" fill="#ffc300" stroke="#1f2a44" stroke-width="1.5" stroke-linejoin="round"/></g>`;
};

/** A statement card: a band with the symbol, the words, notches like the blocks; `slot` draws the gap of a loop or choice. */
function card(
  x: number,
  y: number,
  w: number,
  kind: Kind,
  text: string,
  slot: string | null,
  extra = "",
  otherwise: string | null = null,
): string {
  const h = slot === null ? 24 : otherwise === null ? 44 : 72;
  const c = COLOURS[kind];
  const notch = (yy: number): string =>
    `<path d="M ${x + 14} ${yy} h 4 l 2 2.5 h 6 l 2 -2.5 h 4" fill="none" stroke="#1f2a44" stroke-width="0.6"/>`;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="#fff" stroke="${c}" stroke-width="1.4"/>`,
    `<rect x="${x}" y="${y}" width="10" height="${h}" rx="2.5" fill="${c}"/>`,
    `<text x="${x + 5}" y="${y + 7.5}" font-size="6" fill="#fff" text-anchor="middle" font-family="sans-serif">${SYMBOL[kind]}</text>`,
    `<text x="${x + 14}" y="${y + 14.5}" font-size="6.2" font-weight="700" fill="#111" font-family="sans-serif">${esc(text)}</text>`,
    notch(y),
    slot === null
      ? ""
      : `<rect x="${x + 16}" y="${y + 19}" width="${w - 22}" height="18" rx="2" fill="none" stroke="#555" stroke-width="0.5" stroke-dasharray="2 1.5"/><text x="${x + 19}" y="${y + 30}" font-size="3.8" fill="#444" font-family="sans-serif">${esc(slot)}</text>`,
    slot === null || otherwise === null
      ? ""
      : `<text x="${x + 14}" y="${y + 45}" font-size="6.2" font-weight="700" fill="#111" font-family="sans-serif">${esc(otherwise)}</text><rect x="${x + 16}" y="${y + 48}" width="${w - 22}" height="18" rx="2" fill="none" stroke="#555" stroke-width="0.5" stroke-dasharray="2 1.5"/><text x="${x + 19}" y="${y + 59}" font-size="3.8" fill="#444" font-family="sans-serif">${esc(slot)}</text>`,
    extra,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="none" stroke="#999" stroke-width="0.2" stroke-dasharray="1 1"/>`,
  ].join("");
}

/** A question card: a hexagon like the question blocks. */
function question(x: number, y: number, w: number, text: string): string {
  const h = 16;
  const c = COLOURS.sense;
  return `<path d="M ${x + 6} ${y} H ${x + w - 6} L ${x + w} ${y + h / 2} L ${x + w - 6} ${y + h} H ${x + 6} L ${x} ${y + h / 2} Z" fill="#fff" stroke="${c}" stroke-width="1.4"/><text x="${x + w / 2}" y="${y + 10}" font-size="${Math.min(4.6, 58 / text.length).toFixed(2)}" font-weight="700" fill="#111" text-anchor="middle" font-family="sans-serif">${esc(text)}</text>`;
}

function page(lang: string, title: string, body: string, footer: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297" lang="${lang}">
<title>${esc(title)}</title>
<rect width="210" height="297" fill="#fff"/>
<text x="12" y="16" font-size="7" font-weight="700" fill="#111" font-family="sans-serif">${esc(title)}</text>
${body}
<text x="12" y="289" font-size="3" fill="#444" font-family="sans-serif">${esc(footer)}</text>
</svg>
`;
}

export function cards(lang: "de" | "en"): Record<string, string> {
  const m = JSON.parse(readFileSync(`src/messages/${lang}.json`, "utf8")) as Record<string, string>;
  const t = (key: string): string => (m[key] ?? key).replace("%1", "___").replace("%2", "___");
  const L =
    lang === "de"
      ? {
          cards: "Kiko-Befehlskarten",
          control: "Kiko-Karten: Schleifen, Entscheidungen, Fragen",
          board: "Kiko-Spielfeld",
          slot: "Karten hier anlegen",
          cut: "Ausschneiden, legen, ausprobieren: Ein Kind ist Kiko und folgt den Karten.",
          tokens: "Zum Ausschneiden: Kiko, Ziel und Wände",
          footer: "lernapps.net/coding · © 2026 Oliver Jägle, CC BY 4.0 · gleiche Wörter und Farben wie die Blöcke",
          else: "sonst",
        }
      : {
          cards: "Kiko command cards",
          control: "Kiko cards: loops, choices, questions",
          board: "Kiko board",
          slot: "put cards here",
          cut: "Cut out, lay out, try out: one child is Kiko and follows the cards.",
          tokens: "To cut out: Kiko, goal and walls",
          footer: "lernapps.net/coding · © 2026 Oliver Jägle, CC BY 4.0 · same words and colours as the blocks",
          else: "else",
        };
  const W = 90;
  const xs = [12, 108];
  // Page 1: the start card and the commands.
  const one: string[] = [];
  const list: [Kind, string][] = [
    ["start", t("block-programm")],
    ...Array.from({ length: 7 }, (): [Kind, string] => ["move", t("block-vorwaerts")]),
    ...Array.from({ length: 4 }, (): [Kind, string] => ["move", t("block-links")]),
    ...Array.from({ length: 4 }, (): [Kind, string] => ["move", t("block-rechts")]),
  ];
  list.forEach(([kind, text], i) => {
    const x = xs[i % 2] ?? 12;
    const y = 26 + Math.floor(i / 2) * 31;
    one.push(card(x, y, W, kind, text, null, kind === "start" ? kiko(x + W - 12, y + 12, 18) : ""));
  });
  // Page 2: loops and choices with their gaps, then the questions.
  const two: string[] = [];
  const control: [string, string | null][] = [
    [t("block-wiederhole"), null],
    [t("block-wiederhole"), null],
    [t("block-solange"), null],
    [t("block-solange"), null],
    [t("block-wenn"), null],
    [t("block-wenn-sonst"), L.else],
  ];
  control.forEach(([text, otherwise], i) => {
    const x = xs[i % 2] ?? 12;
    const y = 26 + Math.floor(i / 2) * 50;
    two.push(card(x, y, W, "control", text, L.slot, "", otherwise));
  });
  const qs = [
    "block-wand-voraus",
    "block-wand-voraus",
    "block-weg-frei",
    "block-weg-frei",
    "block-am-ziel",
    "block-am-ziel",
    "block-wand-links",
    "block-wand-rechts",
    "block-nicht",
    "block-nicht",
  ];
  qs.forEach((key, i) => two.push(question(12 + (i % 4) * 47, 206 + Math.floor(i / 4) * 21, 44, t(key))));
  // Page 3: the board and the pieces to cut out.
  const three: string[] = [];
  const cell = 28;
  const ox = 21;
  const oy = 32;
  for (let i = 0; i < 6; i++) {
    three.push(
      `<text x="${ox + i * cell + cell / 2}" y="${oy - 3}" font-size="5" text-anchor="middle" font-family="sans-serif">${i + 1}</text>`,
    );
    three.push(
      `<text x="${ox - 4}" y="${oy + i * cell + cell / 2 + 2}" font-size="5" text-anchor="end" font-family="sans-serif">${i + 1}</text>`,
    );
    for (let j = 0; j < 6; j++)
      three.push(
        `<rect x="${ox + j * cell}" y="${oy + i * cell}" width="${cell}" height="${cell}" fill="#fff" stroke="#111" stroke-width="0.5"/>`,
      );
  }
  three.push(
    `<text x="12" y="${oy + 6 * cell + 14}" font-size="5" font-weight="700" font-family="sans-serif">${esc(L.tokens)}</text>`,
  );
  const ty = oy + 6 * cell + 20;
  three.push(
    `<rect x="12" y="${ty}" width="${cell - 2}" height="${cell - 2}" fill="#fff" stroke="#999" stroke-width="0.2" stroke-dasharray="1 1"/>${kiko(12 + 13, ty + 13, 22)}`,
  );
  three.push(
    `<rect x="${12 + cell}" y="${ty}" width="${cell - 2}" height="${cell - 2}" fill="#e6f2e3" stroke="#1e5a20" stroke-width="1"/><line x1="${12 + cell + 9}" y1="${ty + 5}" x2="${12 + cell + 9}" y2="${ty + 22}" stroke="#1f2a44" stroke-width="1"/><path d="M ${12 + cell + 9} ${ty + 5} l 10 3 l -10 3 Z" fill="#2f7d32"/>`,
  );
  for (let w = 0; w < 4; w++)
    three.push(
      `<rect x="${12 + (2 + w) * cell}" y="${ty}" width="${cell - 2}" height="${cell - 2}" fill="#3b4252" stroke="#111" stroke-width="0.4"/>`,
    );
  three.push(
    `<text x="12" y="${ty + cell + 8}" font-size="4.2" fill="#111" font-family="sans-serif">${esc(L.cut)}</text>`,
  );
  return {
    "befehlskarten-1.svg": page(lang, L.cards, one.join("\n"), L.footer),
    "befehlskarten-2.svg": page(lang, L.control, two.join("\n"), L.footer),
    "spielfeld.svg": page(lang, L.board, three.join("\n"), L.footer),
  };
}

/** Writes the pages into `root/<lang>/`. */
export function writeCards(root: string): void {
  for (const lang of ["de", "en"] as const) {
    mkdirSync(join(root, lang), { recursive: true });
    for (const [name, svg] of Object.entries(cards(lang))) writeFileSync(join(root, lang, name), svg);
  }
}

if (process.argv[1]?.endsWith("build-cards.ts")) writeCards("public/karten");
