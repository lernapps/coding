<script setup lang="ts">
// Kiko, the robot of the workshop (a recurring picture of the computer science apps): drawn upright, centred on
// (0, 0), about 40 units tall; the pointer on its ring shows where it faces. Self-drawn SVG, CC BY 4.0 like the content.
defineProps<{ facing: "north" | "east" | "south" | "west"; crashed?: boolean }>();
const ANGLE = { north: -90, east: 0, south: 90, west: 180 } as const;
</script>

<template>
  <g class="kiko" aria-hidden="true">
    <circle r="19" class="ring" :class="{ crashed }" />
    <g :transform="`rotate(${ANGLE[facing]})`">
      <path d="M 16 -5 L 22 0 L 16 5 Z" class="pointer" />
    </g>
    <line x1="0" y1="-11" x2="0" y2="-16" class="line" />
    <circle cx="0" cy="-16.5" r="2" class="lamp" />
    <rect x="-10" y="-11" width="20" height="13" rx="5" class="body" />
    <rect x="-7" y="-8.5" width="14" height="7.5" rx="3" class="visor" />
    <circle cx="-3.2" cy="-4.8" r="1.7" class="eye" />
    <circle cx="3.2" cy="-4.8" r="1.7" class="eye" />
    <rect x="-7.5" y="3" width="15" height="8" rx="3" class="body" />
    <rect x="-8.5" y="11" width="6" height="3.5" rx="1.5" class="visor" />
    <rect x="2.5" y="11" width="6" height="3.5" rx="1.5" class="visor" />
  </g>
</template>

<style scoped>
.ring {
  fill: rgb(255 255 255 / 0.55);
  stroke: #1f2a44;
  stroke-width: 1;
}
.ring.crashed {
  stroke: #c0182c;
  stroke-width: 3;
}
.pointer,
.visor {
  fill: #1f2a44;
}
.line {
  stroke: #5c2400;
  stroke-width: 1.5;
}
.lamp {
  fill: #ffc300;
  stroke: #5c2400;
  stroke-width: 0.8;
}
.body {
  fill: #e8590c;
  stroke: #5c2400;
  stroke-width: 1.2;
}
.eye {
  fill: #fff;
}
</style>
