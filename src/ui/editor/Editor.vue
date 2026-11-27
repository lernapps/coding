<script setup lang="ts">
// The block editor (Blockly), loaded on demand. It is only the input: every change of the blocks becomes the program
// IR, which the root component sends to the core as the action "programm". While a run goes on, the block that ran
// last is highlighted.
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import type { Program } from "../../core/ir.ts";
import { Blockly, programOf, setUp, START, toolboxOf, workspaceOf } from "./blocks.ts";
import { langOf, texts } from "../texts.ts";

const props = defineProps<{
  lang: string;
  toolbox: readonly string[];
  start: Program | null;
  highlight: string | null;
  /** The start is a program saved on the device: its blocks get new ids, so the editor sends it once after loading. */
  restored?: boolean;
  /** Only to read (a prediction): no toolbox, nothing to move or change. */
  readOnly?: boolean;
}>();
const emit = defineEmits<{ program: [program: Program] }>();
const host = useTemplateRef<HTMLDivElement>("host");
const { t } = texts(props.lang);
let workspace: Blockly.WorkspaceSvg | undefined;
let stopObserving: (() => void) | undefined;
/** Blocks that hang nowhere under "Programm" (they do not run), for the note below the work area. */
const loose = ref(0);
/** Whether the learner last used the keyboard or the pointer in the editor. */
let lastInput: "key" | "pointer" = "pointer";

/** The connection at the end of the program: below its last block, or the first place under "Programm". */
function endOfProgram(ws: Blockly.WorkspaceSvg): Blockly.Connection | null {
  const start = ws.getTopBlocks(false).find((b) => b.type === START);
  if (start === undefined) return null;
  let last = start.getInputTargetBlock("DO");
  if (last === null) return start.getInput("DO")?.connection ?? null;
  while (last.getNextBlock() !== null) last = last.getNextBlock() as Blockly.BlockSvg;
  return last.nextConnection;
}

/**
 * A block dropped below the program (with the mouse a bit too low, or put down by keyboard without choosing a place)
 * goes to the end of the program: learners build from the top down and expect it there (#495). A block dropped to
 * the side stays where it is, pale, with a warning.
 */
function attachDropped(ws: Blockly.WorkspaceSvg, event: Blockly.Events.Abstract): void {
  // A drop (by mouse or keyboard) ends with a move while the workspace still counts as dragging: look once it is over.
  const id =
    event.type === Blockly.Events.BLOCK_MOVE
      ? (event as Blockly.Events.BlockMove).blockId
      : event.type === Blockly.Events.BLOCK_DRAG && !(event as Blockly.Events.BlockDrag).isStart
        ? (event as Blockly.Events.BlockDrag).blockId
        : undefined;
  if (id === undefined) return;
  setTimeout(() => {
    if (ws.isDragging()) return;
    const block = ws.getBlockById(id);
    const start = ws.getTopBlocks(false).find((b) => b.type === START);
    if (block === null || start === undefined || block === start || block.getParent() !== null) return;
    if (block.previousConnection === null || block.isInFlyout) return;
    const box = start.getBoundingRectangle();
    const at = block.getRelativeToSurfaceXY();
    // A keyboard drop without a chosen place lands anywhere; a mouse drop counts only below the program.
    if (lastInput !== "key" && (at.y < box.bottom - 20 || at.x > box.right + 40)) return;
    const end = endOfProgram(ws);
    if (end === null) return;
    end.connect(block.previousConnection);
  }, 0);
}

/** A warning on every loose block, and their number. */
function markLoose(ws: Blockly.WorkspaceSvg): void {
  let count = 0;
  for (const top of ws.getTopBlocks(false)) {
    if (top.type === START) continue;
    count += top.getDescendants(false).length;
    top.setWarningText(t("loose-block"));
  }
  for (const b of ws.getAllBlocks(false)) if (b.getRootBlock().type === START) b.setWarningText(null);
  loose.value = count;
}

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
  // Narrow: the blocks in a row above the work area, which stays free. Wide: categories when there are many blocks.
  const categories = !narrow && props.toolbox.length > 6;
  const readOnly = props.readOnly === true;
  workspace = Blockly.inject(root, {
    ...(readOnly ? { readOnly: true } : { toolbox: toolboxOf(props.toolbox, lang, categories), trashcan: true }),
    renderer: "zelos",
    horizontalLayout: narrow,
    toolboxPosition: "start",
    sounds: false,
    media: new URL("../blockly-media/", import.meta.url).href,
    zoom: { controls: true, startScale: narrow || readOnly ? 0.75 : 0.9 },
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
  root.addEventListener("keydown", () => (lastInput = "key"), true);
  root.addEventListener("pointerdown", () => (lastInput = "pointer"), true);
  hideFlyoutFigures(root);
  const observer = new MutationObserver(() => hideFlyoutFigures(root));
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["role"] });
  stopObserving = () => observer.disconnect();
  if (props.restored === true) emit("program", programOf(workspace));
  // Loose blocks (not under "Programm") turn pale, so that a learner sees they do not run.
  workspace.addChangeListener((event) => {
    if (workspace !== undefined) attachDropped(workspace, event);
  });
  workspace.addChangeListener(Blockly.Events.disableOrphans);
  workspace.addChangeListener((event) => {
    if (!event.isUiEvent && workspace !== undefined && !workspace.isDragging()) markLoose(workspace);
  });
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
  <p class="loose" aria-live="polite">{{ loose > 0 ? t("loose-blocks", { count: loose }) : "" }}</p>
</template>

<style scoped>
.editor {
  width: 100%;
  height: min(40rem, 80vh);
  min-height: 22rem;
}
.loose {
  min-height: 1.5em;
  margin: 0.25rem 0 0;
  color: #8a2a00;
  font-weight: 600;
}
</style>

<style>
/* The block that ran last: a clear dark frame (contrast on the work area and the blocks) instead of Blockly's pale emboss, which looks like a switched-off block. */
.blocklyHighlighted > .blocklyPath {
  filter: none;
  stroke: #111827;
  stroke-width: 5px;
}
</style>
