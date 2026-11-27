<script setup lang="ts">
// The program as text, in the words of the blocks: nested lists, so that a learner who cannot see the blocks (or reads
// them more easily as lines) can follow it. Shown with a prediction, where the program is only to read.
import { computed, h, type VNode } from "vue";
import type { Expr, Program, Stmt } from "../core/ir.ts";
import { texts, type Key } from "./texts.ts";

const props = defineProps<{ program: Program; lang: string; highlight?: string | null }>();
const { t } = texts(props.lang);
const block = (id: string, value = ""): string => t(`block-${id}` as Key).replace("%1", value);

function expr(e: Expr | undefined): string {
  if (e === undefined) return "?";
  switch (e.e) {
    case "num":
      return String(e.value);
    case "sense":
      return block(e.name);
    case "not":
      return block("nicht", expr(e.a));
    default:
      return "?";
  }
}

function list(body: readonly Stmt[]): VNode {
  return h(
    "ol",
    body.map((s) => line(s)),
  );
}

/** A line; the one whose block ran last is marked (as in the editor). */
function item(s: Stmt, children: (VNode | string)[]): VNode {
  const now = s.id !== undefined && s.id === props.highlight;
  return h("li", now ? { class: "current", "aria-current": "step" } : {}, children);
}

function line(s: Stmt): VNode {
  switch (s.s) {
    case "cmd":
      return item(s, [block(s.name, expr(s.args[0]))]);
    case "repeat":
      return item(s, [block("wiederhole", expr(s.times)), list(s.body)]);
    case "while":
      return item(s, [block("solange", expr(s.cond)), list(s.body)]);
    case "if":
      return item(s, [
        block("wenn", expr(s.cond)),
        list(s.then),
        ...(s.else === undefined ? [] : [h("span", t("block-sonst")), list(s.else)]),
      ]);
    default:
      return h("li", "?");
  }
}

const Tree = computed(() => () => list(props.program.main));
</script>

<template>
  <section class="program-text" :aria-label="t('program-text')">
    <h3>{{ t("program-text") }}</h3>
    <component :is="Tree" />
  </section>
</template>

<style scoped>
.program-text > :deep(ol) {
  padding-left: 0.5rem;
}
.program-text :deep(li.current) {
  outline: 3px solid #111827;
  outline-offset: 1px;
  background: #fff7d6;
}
.program-text h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1rem;
}
.program-text :deep(ol) {
  margin: 0;
  padding-left: 1.5rem;
  list-style: none;
  font-family: ui-monospace, monospace;
}
</style>
