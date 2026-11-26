<script setup lang="ts">
// Spike: Editor, Labyrinth als SVG, Knöpfe; Weg A liest ?c= in onMounted und gibt die Challenge als Aktion.
import { onMounted, watch } from "vue";
import { announce } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import type { Input, Json } from "@lernapps/app-templates/interactive";
import type { State, Stmt } from "../core/index.ts";
import Editor from "./Editor.vue";
import de from "../messages/de.json";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const t = translator(de);
const act = (name: string, value?: Json): void =>
  emit("input", value === undefined ? { kind: "action", name } : { kind: "action", name, value });

async function decode(param: string): Promise<unknown> {
  const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.parse(await new Response(stream).text()) as unknown;
}

onMounted(async () => {
  const c = new URL(location.href).searchParams.get("c");
  if (c === null) return;
  try {
    act("challenge", (await decode(c)) as Json);
  } catch {
    act("challenge", null);
  }
});

watch(
  () => props.state.status,
  (s) => {
    if (s !== "edit" && s !== "running") announce(t(`status-${s}`));
  },
);
const CELL = 24;
</script>

<template>
  <section :aria-label="t('app')">
    <svg
      :viewBox="`0 0 ${state.challenge.map[0]!.length * CELL} ${state.challenge.map.length * CELL}`"
      class="maze"
      role="img"
      :aria-label="t('maze', { x: state.robot.x, y: state.robot.y })"
    >
      <template v-for="(row, y) in state.challenge.map" :key="y">
        <rect
          v-for="(ch, x) in row"
          :key="x"
          :x="x * CELL"
          :y="y * CELL"
          :width="CELL"
          :height="CELL"
          :fill="ch === '#' ? '#445' : ch === 'Z' ? '#8c8' : '#eee'"
        />
      </template>
      <circle :cx="state.robot.x * CELL + CELL / 2" :cy="state.robot.y * CELL + CELL / 2" :r="CELL / 3" fill="#d50" />
    </svg>
    <p>{{ t(`status-${state.status}`) }} · {{ state.steps }}</p>
    <p v-if="state.error">{{ t("invalid") }}</p>
    <Editor @program="(ir: Stmt[]) => act('programm', ir as unknown as Json)" />
    <div class="buttons">
      <button type="button" @click="act('start')">{{ t("run") }}</button>
      <button type="button" @click="act('schritt')">{{ t("step") }}</button>
      <button type="button" @click="act('stopp')">{{ t("stop") }}</button>
    </div>
  </section>
</template>

<style scoped>
.maze {
  width: 100%;
  max-height: 14rem;
}
.buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
