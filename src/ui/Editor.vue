<script setup lang="ts">
// Spike: Blockly als reine Eingabe. Jede Änderung → Aktion "programm" mit dem IR.
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import type { Stmt } from "../core/index.ts";
import { Blockly, toIR, toolbox } from "./blocks.ts";

const emit = defineEmits<{ program: [ir: Stmt[]] }>();
const host = useTemplateRef<HTMLDivElement>("host");
let ws: Blockly.WorkspaceSvg | undefined;

onMounted(() => {
  if (host.value === null) return;
  ws = Blockly.inject(host.value, {
    toolbox,
    trashcan: true,
    sounds: false,
    media: "../blockly-media/",
    renderer: "zelos",
    zoom: { controls: true, startScale: 0.8 },
    move: { scrollbars: true, drag: true, wheel: false },
  });
  // Spike-Workaround: Blockly 13 legt Teilpfade der Blöcke im Flyout als role=figure in die listbox (axe).
  const fix = (): void => {
    for (const el of host.value?.querySelectorAll('[role="listbox"] [role="figure"]') ?? []) {
      el.removeAttribute("role");
      el.setAttribute("aria-hidden", "true");
    }
  };
  fix();
  new MutationObserver(fix).observe(host.value, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["role"],
  });
  ws.addChangeListener((e) => {
    if (e.isUiEvent || ws === undefined) return;
    emit("program", toIR(ws));
  });
});
onBeforeUnmount(() => ws?.dispose());
</script>

<template>
  <div ref="host" class="editor" />
</template>

<style scoped>
.editor {
  height: 22rem;
  width: 100%;
}
</style>
