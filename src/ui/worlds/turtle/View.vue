<script setup lang="ts">
// The view of the world "turtle": the sheet with a scale every 50 units, the target picture in grey, the lines Kiko
// drew in their colours, and Kiko itself. A text says the same for screen readers.
import { computed } from "vue";
import { SIZE, targetLines, type TurtleConfig, type TurtleState } from "../../../core/worlds/turtle.ts";
import Robot from "../Robot.vue";

const props = defineProps<{
  config: TurtleConfig;
  state: TurtleState;
  crashed: boolean;
  label: string;
  still: boolean;
}>();
const PAD = 26;
const TICKS = [0, 50, 100, 150, 200];
const COLOURS = ["#1f5fbf", "#d9480f", "#2b8a3e", "#7048e8"];
const target = computed(() => targetLines(props.config));
</script>

<template>
  <svg :viewBox="`0 0 ${SIZE + PAD + 10} ${SIZE + PAD + 10}`" class="turtle" role="img" :aria-label="label">
    <g :transform="`translate(${PAD}, ${PAD})`">
      <rect :width="SIZE" :height="SIZE" class="sheet" />
      <template v-for="v in TICKS" :key="v">
        <line :x1="v" y1="0" :x2="v" :y2="SIZE" class="grid" />
        <line x1="0" :y1="v" :x2="SIZE" :y2="v" class="grid" />
        <text :x="v" y="-8" class="num">{{ v }}</text>
        <text x="-6" :y="v + 3" class="num end">{{ v }}</text>
      </template>
      <line v-for="(l, i) in target" :key="`t${i}`" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]" class="target" />
      <line
        v-for="(l, i) in state.lines"
        :key="`d${i}`"
        :x1="l[0]"
        :y1="l[1]"
        :x2="l[2]"
        :y2="l[3]"
        :stroke="COLOURS[l[4] - 1]"
        class="drawn"
      />
      <g class="robot" :class="{ still }" :style="{ transform: `translate(${state.x}px, ${state.y}px) scale(0.5)` }">
        <Robot :angle="state.winkel - 90" :crashed="crashed" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.turtle {
  display: block;
  width: 100%;
  max-height: 60vh;
}
.sheet {
  fill: #fffdf6;
  stroke: #b9b4a5;
}
.grid {
  stroke: #ebe6d8;
  stroke-width: 0.6;
}
.num {
  font-size: 9px;
  text-anchor: middle;
  fill: currentColor;
}
.num.end {
  text-anchor: end;
}
.target {
  stroke: #8a8a8a;
  stroke-width: 5;
  stroke-linecap: round;
}
.drawn {
  stroke-width: 2;
  stroke-linecap: round;
}
.robot {
  transition: transform 0.15s linear;
}
.robot.still {
  transition: none;
}
</style>
