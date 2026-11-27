<script setup lang="ts">
// The view of the world "labyrinth": the map as SVG, with column and row numbers (the feedback names fields by them),
// the trail of the robot and Kiko. A text says the same for screen readers. With a prediction it shows the fields the
// learner set (numbered, joined by a dashed line) and takes a click on a field; the keyboard way is in the panel.
import { computed } from "vue";
import type { LabyrinthConfig, LabyrinthState } from "../../../core/worlds/labyrinth.ts";
import Robot from "../Robot.vue";

const props = defineProps<{
  config: LabyrinthConfig;
  state: LabyrinthState;
  crashed: boolean;
  label: string;
  still: boolean;
  /** The predicted way, as "x,y" from 0; undefined without a prediction. */
  predicted?: readonly string[] | undefined;
  /** After a run that parted from the prediction: the predicted field where it parted. */
  wrong?: string | null;
}>();
const emit = defineEmits<{ field: [key: string] }>();
const CELL = 40;
const ANGLE = { north: -90, east: 0, south: 90, west: 180 } as const;
const PAD = 22;
const width = computed(() => (props.config.map[0]?.length ?? 1) * CELL + PAD + 8);
const height = computed(() => props.config.map.length * CELL + PAD + 8);
const cells = computed(() =>
  props.config.map.flatMap((row, y) =>
    [...row].map((ch, x) => ({ ch, x: PAD + x * CELL, y: PAD + y * CELL, key: `${x},${y}` })),
  ),
);
const trail = computed(() => new Set(props.state.trail));
const centre = (key: string): [number, number] => {
  const [x, y] = key.split(",").map(Number);
  return [PAD + (x ?? 0) * CELL + CELL / 2, PAD + (y ?? 0) * CELL + CELL / 2];
};
/** The numbers of the steps on each field ("2, 5" when the way comes back). */
const numbers = computed(() => {
  const out = new Map<string, number[]>();
  (props.predicted ?? []).forEach((key, i) => out.set(key, [...(out.get(key) ?? []), i + 1]));
  return [...out].map(([key, steps]) => ({ key, at: centre(key), text: steps.join(", ") }));
});
/** Kiko's way so far, as a line on top of the prediction (with a prediction only). */
const went = computed(() =>
  props.predicted === undefined || props.state.trail.length < 2
    ? ""
    : props.state.trail.map((k) => centre(k).join(",")).join(" "),
);
const wrongAt = computed(() => (props.wrong ? centre(props.wrong) : null));
const path = computed(() => {
  const way = props.predicted ?? [];
  const startKey = props.config.map.flatMap((row, y) => (row.includes("S") ? [`${row.indexOf("S")},${y}`] : []))[0];
  return way.length === 0 || startKey === undefined ? "" : [startKey, ...way].map((k) => centre(k).join(",")).join(" ");
});
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="labyrinth" role="img" :aria-label="label">
    <text v-for="(_, x) in config.map[0]" :key="`c${x}`" :x="PAD + x * CELL + CELL / 2" :y="15" class="num">
      {{ x + 1 }}
    </text>
    <text v-for="(_, y) in config.map" :key="`r${y}`" :x="11" :y="PAD + y * CELL + CELL / 2 + 4" class="num">
      {{ y + 1 }}
    </text>
    <g v-for="c in cells" :key="c.key">
      <rect
        :x="c.x"
        :y="c.y"
        :width="CELL"
        :height="CELL"
        :class="[
          c.ch === '#' ? 'wall' : c.ch === 'Z' ? 'goal' : 'floor',
          { pick: predicted !== undefined && c.ch !== '#' },
        ]"
        @click="predicted !== undefined && c.ch !== '#' && emit('field', c.key)"
      />
      <circle v-if="c.ch !== '#' && trail.has(c.key)" :cx="c.x + CELL / 2" :cy="c.y + CELL / 2" r="4" class="trail" />
      <g v-if="c.ch === 'Z'" :transform="`translate(${c.x + 12}, ${c.y + 8})`">
        <line x1="2" y1="0" x2="2" y2="25" class="pole" />
        <path d="M 2 1 L 18 6 L 2 11 Z" class="flag" />
      </g>
    </g>
    <polyline v-if="path !== ''" :points="path" class="way" />
    <g v-for="n in numbers" :key="`n${n.key}`" class="step">
      <circle :cx="n.at[0]" :cy="n.at[1]" r="11" />
      <text :x="n.at[0]" :y="n.at[1] + 4">{{ n.text }}</text>
    </g>
    <polyline v-if="went !== ''" :points="went" class="went" />
    <rect
      v-if="wrongAt !== null"
      :x="wrongAt[0] - CELL / 2 + 3"
      :y="wrongAt[1] - CELL / 2 + 3"
      :width="CELL - 6"
      :height="CELL - 6"
      class="wrong"
    />
    <g
      class="robot"
      :class="{ still }"
      :style="{ transform: `translate(${PAD + state.x * CELL + CELL / 2}px, ${PAD + state.y * CELL + CELL / 2}px)` }"
    >
      <Robot :angle="ANGLE[state.facing]" :crashed="crashed" />
    </g>
  </svg>
</template>

<style scoped>
.labyrinth {
  display: block;
  width: 100%;
  max-height: 60vh;
}
.num {
  font-size: 11px;
  text-anchor: middle;
  fill: currentColor;
}
.wall {
  fill: #3b4252;
}
.floor {
  fill: #f3f1ea;
  stroke: #d8d4c8;
}
.goal {
  fill: #a6dba0;
  stroke: #1e5a20;
  stroke-width: 3;
}
.pole {
  stroke: #1f2a44;
  stroke-width: 2;
}
.flag {
  fill: #2f7d32;
}
.trail {
  fill: #b8460a;
}
.pick {
  cursor: pointer;
}
.way {
  fill: none;
  stroke: #1f5fbf;
  stroke-width: 3;
  stroke-dasharray: 6 4;
  pointer-events: none;
}
.went {
  fill: none;
  stroke: #b8460a;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
  pointer-events: none;
}
.wrong {
  fill: none;
  stroke: #c0182c;
  stroke-width: 4;
  pointer-events: none;
}
.step {
  pointer-events: none;
}
.step circle {
  fill: #1f5fbf;
}
.step text {
  fill: #fff;
  font-size: 11px;
  font-weight: 700;
  text-anchor: middle;
}
.robot {
  pointer-events: none;
  transition: transform 0.15s linear;
}
.robot.still {
  transition: none;
}
</style>
