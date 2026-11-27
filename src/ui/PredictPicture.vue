<script setup lang="ts">
// The learner's prediction in the turtle world: one of several pictures, as radio buttons. Each picture is drawn small
// and described line by line, so a learner who cannot see it can compare the pictures too.
import { computed } from "vue";
import { announce } from "@lernapps/tooling/a11y";
import type { Line } from "../core/worlds/turtle.ts";
import { SIZE } from "../core/worlds/turtle.ts";
import { texts } from "./texts.ts";

const props = defineProps<{
  pictures: readonly Line[][];
  chosen: number | null;
  lang: string;
  busy: boolean;
  test: number;
}>();
const emit = defineEmits<{ act: [name: string, value: number] }>();
const { t } = texts(props.lang);
const LETTERS = "ABCD";
const round = (v: number): number => Math.round(v);

const items = computed(() =>
  props.pictures.map((lines, i) => ({
    i,
    name: t("picture-name", { letter: LETTERS[i] ?? String(i + 1) }),
    lines,
    steps: lines.map((l, k) =>
      t("picture-line", { n: k + 1, x1: round(l[0]), y1: round(l[1]), x2: round(l[2]), y2: round(l[3]) }),
    ),
  })),
);
function choose(i: number): void {
  if (props.busy || i === props.chosen) return;
  emit("act", "bild", i);
  announce(t("picture-chosen", { name: items.value[i]?.name ?? "" }));
}
</script>

<template>
  <fieldset class="pictures">
    <legend>{{ t("picture-legend") }}</legend>
    <div class="grid">
      <div v-for="item in items" :key="`${test}-${item.i}`" class="picture" :class="{ chosen: chosen === item.i }">
        <label>
          <input
            type="radio"
            :name="`bild-${test}`"
            :checked="chosen === item.i"
            :disabled="busy"
            @change="choose(item.i)"
          />
          <span class="name">{{ item.name }}</span>
          <svg :viewBox="`-10 -10 ${SIZE + 20} ${SIZE + 20}`" aria-hidden="true">
            <rect :width="SIZE" :height="SIZE" class="sheet" />
            <line v-for="(l, k) in item.lines" :key="k" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]" class="ink" />
          </svg>
        </label>
        <details>
          <summary>{{ t("picture-describe", { count: item.lines.length }) }}</summary>
          <ol>
            <li v-for="(s, k) in item.steps" :key="k">{{ s }}</li>
          </ol>
        </details>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.pictures {
  border: none;
  padding: 0;
  margin: 0.5rem 0;
}
.pictures legend {
  font-weight: 700;
  padding: 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.picture label {
  display: block;
  cursor: pointer;
}
.picture {
  display: block;
  border: 2px solid #b9b4a5;
  border-radius: 0.4rem;
  padding: 0.4rem;
  cursor: pointer;
}
.picture.chosen {
  border-color: #1f5fbf;
  box-shadow: 0 0 0 2px #1f5fbf;
}
.picture input {
  width: 1.2rem;
  height: 1.2rem;
  vertical-align: middle;
}
.name {
  font-weight: 700;
  margin-left: 0.3rem;
}
svg {
  display: block;
  width: 100%;
  margin: 0.3rem 0;
}
.sheet {
  fill: #fffdf6;
  stroke: #b9b4a5;
}
.ink {
  stroke: #1f2a44;
  stroke-width: 4;
  stroke-linecap: round;
}
details {
  font-size: 0.85rem;
}
details ol {
  margin: 0.25rem 0;
  padding-left: 1.2rem;
}
</style>
