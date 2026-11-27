// World "html", version 1 (spike): learners write HTML and CSS as text; the UI renders them in a sandboxed preview
// (no scripts, no network) and sends the core a snapshot of its DOM: elements with attributes, their own text and some
// computed styles. The check "dom-passt" compares the snapshot with the challenge's expectations (`erwartet`): by
// structure and computed style, never by comparing the text of the code. The core stays without DOM: selectors and
// colours are matched here, on the snapshot.
import { isObject, type Problem } from "../json.ts";
import type { Verdict, World } from "./types.ts";

/** One element of the preview, as the UI read it. Styles are computed ("rgb(255, 0, 0)", "32px"). */
export interface Node {
  tag: string;
  attrs: Record<string, string>;
  /** The element's own text (its text nodes, trimmed, joined by a space). */
  text: string;
  style: Record<string, string>;
  children: Node[];
}
/** What a challenge expects: elements a selector finds, how many, and their text, attributes or styles. */
export interface Expectation {
  selektor: string;
  /** At least so many elements (default 1); 0 means: none. */
  anzahl?: number;
  text?: string;
  attribut?: Record<string, string>;
  stil?: Record<string, string>;
}
export interface HtmlConfig {
  /** The code the learner starts with. */
  html: string;
  css: string;
  erwartet: Expectation[];
}
export interface HtmlState {
  /** The DOM of the last preview the learner checked; null before. */
  dom: Node | null;
}

/** The computed styles the UI reads: what tasks of grades 7-8 ask for. */
export const STYLES = [
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "font-style",
  "text-align",
  "text-decoration-line",
  "display",
  "border-top-style",
  "border-top-width",
  "border-top-color",
  "width",
  "margin-top",
  "padding-top",
] as const;
export const MAX_CODE = 4000;

/** Colours by name (CSS basic and a few more learners use), as rgb. */
const NAMES: Record<string, string> = {
  black: "0,0,0",
  white: "255,255,255",
  red: "255,0,0",
  green: "0,128,0",
  lime: "0,255,0",
  blue: "0,0,255",
  yellow: "255,255,0",
  orange: "255,165,0",
  purple: "128,0,128",
  pink: "255,192,203",
  gray: "128,128,128",
  grey: "128,128,128",
  brown: "165,42,42",
  navy: "0,0,128",
  teal: "0,128,128",
  silver: "192,192,192",
  maroon: "128,0,0",
  olive: "128,128,0",
  aqua: "0,255,255",
  fuchsia: "255,0,255",
};

/** A colour as "r,g,b", from a name, #rgb, #rrggbb or rgb()/rgba(); else the value as it is. */
export function normal(value: string): string {
  const v = value.trim().toLowerCase();
  if (v in NAMES) return NAMES[v] ?? v;
  if (v === "bold") return "700";
  if (v === "normal") return "400";
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)?.[1];
  if (hex !== undefined) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(",");
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  if (rgb !== null) return `${rgb[1]},${rgb[2]},${rgb[3]}`;
  return v.replace(/\s+/g, " ");
}

/** One compound of a selector: tag, #id, .classes. */
interface Compound {
  tag?: string;
  id?: string;
  classes: string[];
}
const COMPOUND = /^([a-z][a-z0-9]*|\*)?((?:[#.][a-z_-][a-z0-9_-]*)*)$/i;
/** A selector of compounds joined by spaces (descendant); null when it uses anything else. */
export function parse(selector: string): Compound[] | null {
  const parts = selector.trim().split(/\s+/);
  const out: Compound[] = [];
  for (const part of parts) {
    const m = COMPOUND.exec(part);
    if (m === null || part === "") return null;
    const rest = m[2] ?? "";
    const id = /#([a-z_-][a-z0-9_-]*)/i.exec(rest)?.[1];
    const classes = [...rest.matchAll(/\.([a-z_-][a-z0-9_-]*)/gi)].map((c) => c[1] ?? "");
    out.push({ ...(m[1] && m[1] !== "*" ? { tag: m[1].toLowerCase() } : {}), ...(id ? { id } : {}), classes });
  }
  return out;
}

const fits = (n: Node, c: Compound): boolean =>
  (c.tag === undefined || n.tag === c.tag) &&
  (c.id === undefined || n.attrs["id"] === c.id) &&
  c.classes.every((k) => (n.attrs["class"] ?? "").split(/\s+/).includes(k));

/** The elements of the tree a selector finds, in document order. */
export function select(root: Node, selector: string): Node[] {
  const compounds = parse(selector);
  if (compounds === null || compounds.length === 0) return [];
  const found: Node[] = [];
  const walk = (n: Node, path: Node[]): void => {
    const last = compounds[compounds.length - 1];
    if (last !== undefined && fits(n, last)) {
      // the other compounds, from right to left, each on an ancestor
      let i = compounds.length - 2;
      for (let a = path.length - 1; a >= 0 && i >= 0; a--) {
        const c = compounds[i];
        const anc = path[a];
        if (c !== undefined && anc !== undefined && fits(anc, c)) i--;
      }
      if (i < 0) found.push(n);
    }
    for (const child of n.children) walk(child, [...path, n]);
  };
  for (const child of root.children) walk(child, []);
  return found;
}

/** The first expectation the DOM does not meet, as a message for the learner. */
export function check(dom: Node, erwartet: readonly Expectation[]): Verdict {
  for (const e of erwartet) {
    const nodes = select(dom, e.selektor);
    const want = e.anzahl ?? 1;
    if (want === 0) {
      if (nodes.length > 0) return { ok: false, why: { key: "fail-html-none", params: { selektor: e.selektor } } };
      continue;
    }
    if (nodes.length < want)
      return {
        ok: false,
        why: { key: "fail-html-count", params: { selektor: e.selektor, want, found: nodes.length } },
      };
    for (const n of nodes) {
      if (e.text !== undefined && n.text.trim() !== e.text.trim())
        return { ok: false, why: { key: "fail-html-text", params: { selektor: e.selektor, text: e.text } } };
      for (const [name, value] of Object.entries(e.attribut ?? {}))
        if (n.attrs[name] !== value)
          return { ok: false, why: { key: "fail-html-attr", params: { selektor: e.selektor, name, value } } };
      for (const [prop, value] of Object.entries(e.stil ?? {}))
        if (normal(n.style[prop] ?? "") !== normal(value))
          return {
            ok: false,
            why: { key: "fail-html-style", params: { selektor: e.selektor, prop, value, found: n.style[prop] ?? "" } },
          };
    }
  }
  return { ok: true };
}

/** The vocabulary of a challenge's toolbox: elements and properties it names (a reference, not blocks). */
export const ELEMENTS = ["h1", "h2", "h3", "p", "strong", "em", "ul", "ol", "li", "a", "img", "div", "span"];
export const PROPERTIES = STYLES.map((s) => s.replace(/-top/, "")).filter((v, i, a) => a.indexOf(v) === i);

export const html: World<HtmlConfig, HtmlState> = {
  id: "html",
  version: 1,
  configProblems(config: unknown, path: string): Problem[] {
    if (!isObject(config)) return [{ path, key: "problem-config" }];
    const p: Problem[] = [];
    for (const key of Object.keys(config))
      if (!["html", "css", "erwartet"].includes(key)) p.push({ path: `${path}.${key}`, key: "problem-unknown-field" });
    for (const key of ["html", "css"])
      if (typeof config[key] !== "string" || (config[key] as string).length > MAX_CODE)
        p.push({ path: `${path}.${key}`, key: "problem-html-code", params: { max: MAX_CODE } });
    const erwartet = config["erwartet"];
    if (!Array.isArray(erwartet) || erwartet.length < 1 || erwartet.length > 20)
      p.push({ path: `${path}.erwartet`, key: "problem-html-expect" });
    else
      erwartet.forEach((e: unknown, i: number) => {
        if (!isObject(e) || typeof e["selektor"] !== "string" || parse(e["selektor"]) === null)
          p.push({ path: `${path}.erwartet[${i}].selektor`, key: "problem-html-selector" });
      });
    return p;
  },
  // Elements and properties are the toolbox's words; they take no arguments and are no commands of a run.
  commands: Object.fromEntries([...ELEMENTS, ...PROPERTIES].map((w) => [w, 0])),
  sensors: {},
  checks: {
    "dom-passt": (s, c): Verdict =>
      s.dom === null ? { ok: false, why: { key: "fail-html-unchecked" } } : check(s.dom, c.erwartet),
  },
  start: () => ({ dom: null }),
  command: (s) => s,
  sense: () => false,
  describe: (s) => ({ key: "describe-html", params: { elements: s.dom === null ? 0 : count(s.dom) - 1 } }),
};

const count = (n: Node): number => 1 + n.children.reduce((sum, c) => sum + count(c), 0);
