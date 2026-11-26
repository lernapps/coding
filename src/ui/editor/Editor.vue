<script setup lang="ts">
// The block editor (Blockly), loaded on demand. It is only the input: every change of the blocks becomes the program
// IR, which the root component sends to the core as the action "programm". While a run goes on, the block that ran
// last is highlighted.
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import type { Program } from "../../core/ir.ts";
import { Blockly, programOf, setUp, toolboxOf, workspaceOf } from "./blocks.ts";
import { langOf, texts } from "../texts.ts";

const props = defineProps<{
  lang: string;
  toolbox: readonly string[];
  start: Program | null;
  highlight: string | null;
}>();
const emit = defineEmits<{ program: [program: Program] }>();
const host = useTemplateRef<HTMLDivElement>("host");
const { t } = texts(props.lang);
let workspace: Blockly.WorkspaceSvg | undefined;
let stopObserving: (() => void) | undefined;

/**
 * Workaround: Blockly 13 puts the parts of a block in the flyout as role=figure into its role=listbox, which axe
 * reports (aria-required-children). They are drawing only, so they are hidden from screen readers.
 * Upstream: https://github.com/RaspberryPiFoundation/blockly/issues (flyout listbox children; reported via lernapps/apps#509)
 */
function hideFlyoutFigures(root: HTMLElement): void {
  for (const element of root.querySelectorAll('[role="listbox"] [role="figure"]')) {
    element.removeAttribute("role");
    element.setAttribute("aria-hidden", "true");
  }
}

onMounted(() => {
  const root = host.value;
  if (root === null) return;
  const lang = langOf(props.lang);
  setUp(lang);
  const narrow = root.clientWidth < 600;
  workspace = Blockly.inject(root, {
    toolbox: toolboxOf(props.toolbox, lang, narrow),
    renderer: "zelos",
    sounds: false,
    media: new URL("../blockly-media/", import.meta.url).href,
    trashcan: true,
    zoom: { controls: true, startScale: narrow ? 0.7 : 0.85 },
    move: { scrollbars: true, drag: true, wheel: false },
  });
  // Loading fires no change events: the core already has the start program, and a late event would overwrite a
  // program the learner (or a playthrough) gave meanwhile.
  Blockly.Events.disable();
  try {
    Blockly.serialization.workspaces.load(workspaceOf(props.start), workspace);
  } finally {
    Blockly.Events.enable();
  }
  hideFlyoutFigures(root);
  const observer = new MutationObserver(() => hideFlyoutFigures(root));
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["role"] });
  stopObserving = () => observer.disconnect();
  workspace.addChangeListener((event) => {
    if (event.isUiEvent || workspace === undefined || workspace.isDragging()) return;
    emit("program", programOf(workspace));
  });
});

watch(
  () => props.highlight,
  (id) => workspace?.highlightBlock(id),
);

onBeforeUnmount(() => {
  stopObserving?.();
  workspace?.dispose();
});
</script>

<template>
  <div ref="host" class="editor" role="region" :aria-label="t('editor')" />
</template>

<style scoped>
.editor {
  width: 100%;
  height: min(28rem, 70vh);
  min-height: 18rem;
}
</style>
