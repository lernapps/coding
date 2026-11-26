<script setup lang="ts">
// The view of the world "labyrinth": the map as SVG, with column and row numbers (the feedback names fields by them),
// the trail of the robot and Kiko. A text says the same for screen readers.
import { computed } from "vue";
import type { LabyrinthConfig, LabyrinthState } from "../../../core/worlds/labyrinth.ts";
import Robot from "../Robot.vue";

const props = defineProps<{
  config: LabyrinthConfig;
  state: LabyrinthState;
  crashed: boolean;
  label: string;
  still: boolean;
}>();
const CELL = 40;
const PAD = 22;
const width = computed(() => (props.config.map[0]?.length ?? 1) * CELL + PAD + 8);
const height = computed(() => props.config.map.length * CELL + PAD + 8);
const cells = computed(() =>
  props.config.map.flatMap((row, y) =>
    [...row].map((ch, x) => ({ ch, x: PAD + x * CELL, y: PAD + y * CELL, key: `${x},${y}` })),
  ),
);
const trail = computed(() => new Set(props.state.trail));
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
        :class="c.ch === '#' ? 'wall' : c.ch === 'Z' ? 'goal' : 'floor'"
      />
      <circle v-if="c.ch !== '#' && trail.has(c.key)" :cx="c.x + CELL / 2" :cy="c.y + CELL / 2" r="4" class="trail" />
      <g v-if="c.ch === 'Z'" :transform="`translate(${c.x + 12}, ${c.y + 8})`">
        <line x1="2" y1="0" x2="2" y2="25" class="pole" />
        <path d="M 2 1 L 18 6 L 2 11 Z" class="flag" />
      </g>
    </g>
    <g
      class="robot"
      :class="{ still }"
      :style="{ transform: `translate(${PAD + state.x * CELL + CELL / 2}px, ${PAD + state.y * CELL + CELL / 2}px)` }"
    >
      <Robot :facing="state.facing" :crashed="crashed" />
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
  stroke: #2f7d32;
}
.pole {
  stroke: #1f2a44;
  stroke-width: 2;
}
.flag {
  fill: #2f7d32;
}
.trail {
  fill: #e8590c;
  opacity: 0.45;
}
.robot {
  transition: transform 0.15s linear;
}
.robot.still {
  transition: none;
}
</style>
