// World html (spike): selectors and colours on a snapshot of the preview, and the model solution of html-1 as the DOM a
// browser computes for it.
import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN } from "../../data/index.ts";
import { start, step } from "../index.ts";
import type { Json } from "../json.ts";
import { check, normal, parse, select, type HtmlConfig, type Node } from "./html.ts";

const el = (
  tag: string,
  attrs: Record<string, string> = {},
  style: Record<string, string> = {},
  children: Node[] = [],
  text = "",
): Node => ({
  tag,
  attrs,
  text,
  style,
  children,
});
const BLUE = { color: "rgb(0, 0, 255)", "font-weight": "700" };
/** What the browser computes for the model solution of html-1. */
const solved = el("body", {}, {}, [
  el("h1", {}, BLUE, [], "Mein Lieblingstier"),
  el("p", {}, { color: "rgb(0, 0, 0)", "font-weight": "400" }, [], "Katzen schlafen viel."),
  el("p", { class: "wichtig" }, { color: "rgb(0, 0, 0)", "font-weight": "700" }, [], "Und sie schnurren."),
]);

describe("world html", () => {
  it("normalises colours and weights", () => {
    expect(normal("blue")).toBe(normal("rgb(0, 0, 255)"));
    expect(normal("#00f")).toBe(normal("#0000ff"));
    expect(normal("bold")).toBe("700");
  });
  it("parses and matches simple selectors", () => {
    expect(parse("ul li.neu")).toHaveLength(2);
    expect(parse("a:hover")).toBeNull();
    expect(select(solved, "p")).toHaveLength(2);
    expect(select(solved, "p.wichtig")).toHaveLength(1);
    expect(select(solved, "body p")).toHaveLength(0); // the root is body itself
  });
  it("accepts the model solution of html-1 and names the first gap", () => {
    const c = BUILT_IN["html-1"];
    const erwartet = (c?.world.config as unknown as HtmlConfig).erwartet;
    expect(check(solved, erwartet)).toEqual({ ok: true });
    const one = { ...solved, children: solved.children.slice(0, 2) };
    expect(check(one, erwartet)).toEqual({
      ok: false,
      why: { key: "fail-html-count", params: { selektor: "p", want: 2, found: 1 } },
    });
  });
  it("runs in the core: code, then a check of the preview", () => {
    let s = start(1, "html-1");
    expect(s.code?.css).toContain("color: black");
    s = step(s, { kind: "action", name: "code", value: { html: "<h1>x</h1>", css: "" } });
    expect(s.code?.html).toBe("<h1>x</h1>");
    s = step(s, { kind: "action", name: "pruefen", value: solved as unknown as Json });
    expect(s.solved).toBe(true);
    expect(s.attempts).toBe(1);
    expect(step(s, { kind: "action", name: "pruefen", value: { tag: 1 } })).toBe(s);
  });
});
