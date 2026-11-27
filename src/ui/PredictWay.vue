<script setup lang="ts">
// The learner's prediction in the labyrinth: the way as a numbered list, and buttons that set the next field up,
// right, down or left on the map (from the last field, or from the start), take back the last one, or clear it. The
// buttons are the keyboard way; a click on the map does the same.
import { computed } from "vue";
import { announce } from "@lernapps/tooling/a11y";
import type { LabyrinthConfig } from "../core/worlds/labyrinth.ts";
import { texts, type Key } from "./texts.ts";

const props = defineProps<{ config: LabyrinthConfig; predicted: readonly string[]; lang: string; busy: boolean }>();
const emit = defineEmits<{ act: [name: string, value?: string] }>();
const { t } = texts(props.lang);

const STEPS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
type Dir = keyof typeof STEPS;
const DIRS = Object.keys(STEPS) as Dir[];
const ARROWS: Record<Dir, string> = { up: "↑", right: "→", down: "↓", left: "←" };

const parse = (key: string): [number, number] => {
  const [x, y] = key.split(",").map(Number);
  return [x ?? 0, y ?? 0];
};
const last = computed((): [number, number] => {
  const key = props.predicted.at(-1);
  if (key !== undefined) return parse(key);
  const y = props.config.map.findIndex((row) => row.includes("S"));
  return [props.config.map[y]?.indexOf("S") ?? 0, y];
});
const name = (x: number, y: number): string => t("field-name", { x: x + 1, y: y + 1 });
const free = (x: number, y: number): boolean => {
  const ch = props.config.map[y]?.[x];
  return ch !== undefined && ch !== "#";
};
const moves = computed(() =>
  DIRS.map((d) => {
    const x = last.value[0] + STEPS[d][0];
    const y = last.value[1] + STEPS[d][1];
    return { d, key: `${x},${y}`, ok: free(x, y), field: name(x, y) };
  }),
);
function add(move: { key: string; ok: boolean; field: string }): void {
  if (!move.ok || props.busy) return;
  emit("act", "feld", move.key);
  announce(t("predict-set", { n: props.predicted.length + 1, field: move.field }));
}
function back(): void {
  if (props.predicted.length === 0 || props.busy) return;
  emit("act", "zurueck");
  announce(t("predict-back", { n: props.predicted.length - 1 }));
}
function clear(): void {
  if (props.predicted.length === 0 || props.busy) return;
  emit("act", "leeren");
  announce(t("predict-cleared"));
}
</script>

<template>
  <section class="predict" :aria-label="t('predict-title')">
    <h3>{{ t("predict-title") }}</h3>
    <p class="from">
      {{
        predicted.length === 0
          ? t("predict-from-start", { field: name(...last) })
          : t("predict-from", { field: name(...last) })
      }}
    </p>
    <div class="moves" role="group" :aria-label="t('predict-next')">
      <button
        v-for="m in moves"
        :key="m.d"
        type="button"
        :class="`dir-${m.d}`"
        :aria-disabled="!m.ok || busy"
        @click="add(m)"
      >
        <span aria-hidden="true">{{ ARROWS[m.d] }}</span> {{ t(`predict-dir-${m.d}` as Key) }}
        <small>{{ m.ok ? m.field : t("predict-wall") }}</small>
      </button>
    </div>
    <ol v-if="predicted.length > 0" class="way-list">
      <li v-for="(key, i) in predicted" :key="i">{{ name(...parse(key)) }}</li>
    </ol>
    <p v-else class="empty">{{ t("predict-empty") }}</p>
    <p class="edit">
      <button type="button" :aria-disabled="predicted.length === 0 || busy" @click="back">
        {{ t("predict-undo") }}
      </button>
      <button type="button" :aria-disabled="predicted.length === 0 || busy" @click="clear">
        {{ t("predict-clear") }}
      </button>
    </p>
  </section>
</template>

<style scoped>
button {
  min-height: 2.75rem;
  padding: 0.3rem 0.7rem;
  font: inherit;
  border-radius: 0.4rem;
  border: 1px solid #1f2a44;
  background: #fff;
  color: #1f2a44;
  cursor: pointer;
}
button[aria-disabled="true"] {
  opacity: 0.55;
  cursor: default;
}
.moves button {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.moves small {
  font-size: 0.8rem;
}
.predict h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1rem;
}
.from,
.empty {
  margin: 0.25rem 0;
}
.moves {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, auto));
  grid-template-areas: ". up ." "left . right" ". down .";
  gap: 0.25rem;
  justify-content: start;
}
.dir-up {
  grid-area: up;
}
.dir-right {
  grid-area: right;
}
.dir-down {
  grid-area: down;
}
.dir-left {
  grid-area: left;
}
.way-list {
  margin: 0.5rem 0;
  padding-left: 2rem;
  columns: 2;
}
.edit {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
