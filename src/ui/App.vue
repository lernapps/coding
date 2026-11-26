<script setup lang="ts">
// The root component: the challenge (title, task, limits), the world with its controls and the feedback per test case,
// the block editor (loaded on demand), hints and the way back. It shows the core's state and sends actions; it keeps
// no state of the task itself.
import { computed, defineAsyncComponent, h, nextTick, onMounted, ref, watch } from "vue";
import { announce, prefersReducedMotion } from "@lernapps/tooling/a11y";
import type { Input, Json } from "@lernapps/app-templates/interactive";
import { configAt, testCount } from "../core/challenge.ts";
import type { State } from "../core/index.ts";
import { currentBlock } from "../core/interpreter.ts";
import type { Program } from "../core/ir.ts";
import type { Msg } from "../core/json.ts";
import { worldOf } from "../core/worlds/index.ts";
import { BUILT_IN, ROUTES } from "../data/index.ts";
import { progress, type Progress } from "./progress.ts";
import { texts, type Key } from "./texts.ts";
import de from "../messages/de.json";
import { VIEWS } from "./worlds/index.ts";
import Authoring from "./Authoring.vue";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const { t, say, text } = texts(props.lang);
const act = (name: string, value?: Json): void =>
  emit("input", value === undefined ? { kind: "action", name } : { kind: "action", name, value });

const Editor = defineAsyncComponent({
  loader: () => import("./editor/Editor.vue"),
  loadingComponent: { render: () => h("p", { class: "loading" }, t("loading-editor")) },
  delay: 0,
});

const origin = ref("https://lernapps.net");
let memory: Progress | undefined;
/** The key of the task on this device, its program saved there and whether it was solved before. */
const taskKey = computed(() =>
  props.state.challenge === null ? null : `${props.state.source}:${props.state.challenge.id}`,
);
const saved = ref<{ key: string; program: Program | undefined; solved: boolean } | null>(null);
const remember = (): void => {
  const key = taskKey.value;
  if (memory === undefined || key === null) return;
  const program = memory.program(key);
  saved.value = { key, program, solved: memory.solved(key) };
  if (program !== undefined) act("programm", program as unknown as Json);
};
const still = ref(false);
let copyText: ((value: string) => Promise<void>) | undefined;
const copied = ref(false);

onMounted(() => {
  if (location.hostname === "lernapps.net" || location.hostname.endsWith(".lernapps.net"))
    origin.value = location.origin;
  still.value = prefersReducedMotion();
  if (navigator.clipboard !== undefined) copyText = (value) => navigator.clipboard.writeText(value);
  memory = progress();
  remember();
  // The parameters of the address (?c=) hold for the whole visit (runtime contract). A learner who clicks a route of the
  // list leaves the challenge of the address: a new visit of that route, without `c`.
  document.addEventListener("click", (event) => {
    if (props.state.source !== "address" || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>(".interactive-routes a");
    if (link === null) return;
    event.preventDefault();
    location.assign(location.pathname + link.hash);
  });
});

const c = computed(() => props.state.challenge);
const world = computed(() => (c.value === null ? undefined : worldOf(c.value.world.type, c.value.world.version)));
const config = computed(() => (c.value === null ? null : configAt(c.value, props.state.test)));
const worldState = computed(() => {
  if (props.state.run !== null) return props.state.run.world;
  return world.value !== undefined && config.value !== null ? world.value.start(config.value) : null;
});
const view = computed(() => (c.value === null ? undefined : VIEWS[c.value.world.type]));
const tests = computed(() => (c.value === null ? 0 : testCount(c.value)));
const description = computed(() => {
  if (world.value === undefined || worldState.value === null || config.value === null) return "";
  const msg = world.value.describe(worldState.value, config.value);
  const goal =
    msg.params?.["goal"] === "yes"
      ? ` ${t("describe-labyrinth-goal")}`
      : msg.key === "describe-turtle"
        ? ` ${t("describe-turtle-target")}`
        : "";
  return say(msg) + goal + around();
});
/** In the labyrinth: where the way is free around Kiko and where the goal is, for a learner who cannot see the map. */
function around(): string {
  const w = world.value;
  const cfg = config.value;
  if (w === undefined || cfg === null || worldState.value === null || c.value?.world.type !== "labyrinth") return "";
  const free = (["ahead", "left", "right"] as const)
    .filter(
      (d) =>
        w.sense(
          worldState.value as never,
          cfg,
          d === "ahead" ? "wand-voraus" : `wand-${d === "left" ? "links" : "rechts"}`,
          [],
        ) === false,
    )
    .map((d) => t(`word-dir-${d}`));
  const map = (cfg as { map: string[] }).map;
  const y = map.findIndex((row) => row.includes("Z"));
  const x = map[y]?.indexOf("Z") ?? -1;
  return ` ${t("describe-labyrinth-around", { free: free.length > 0 ? free.join(", ") : t("word-dir-none"), gx: x + 1, gy: y + 1 })}`;
}
const highlight = computed(() =>
  props.state.run !== null && props.state.phase !== "edit" ? currentBlock(props.state.run) : null,
);
const verdictText = computed(() => {
  const v = props.state.verdict;
  if (v === null) return "";
  if (v.ok)
    return tests.value === 2
      ? t("solved-both")
      : tests.value > 2
        ? t("solved-all", { count: tests.value })
        : t(`solved-${c.value?.world.type ?? "labyrinth"}` as Key);
  const why = say(v.why ?? ({ key: "fail-limit" } as Msg));
  return v.test === 0 || tests.value === 1 ? why : t("failed-test", { n: v.test, why });
});
/** Explanations of the blocks of this task that are more than a command. */
const explained = computed(() =>
  (c.value?.toolbox ?? []).filter((b) => `explain-${b}` in de).map((b) => t(`explain-${b}` as Key)),
);
/** The last task of the collection, solved. */
const lastOfCollection = computed(
  () => props.state.source === "route" && props.state.solved && c.value !== null && ROUTES.at(-1) === c.value.id,
);
/** The first task of its world in the collection: the help is open there. */
const firstOfWorld = computed(
  () =>
    props.state.source === "route" &&
    c.value !== null &&
    ROUTES.find((id) => BUILT_IN[id]?.world.type === c.value?.world.type) === c.value.id,
);
/** The next task of the collection, after a solved one. */
const next = computed(() => {
  if (props.state.source !== "route" || c.value === null || !props.state.solved) return null;
  const id = ROUTES[ROUTES.indexOf(c.value.id) + 1];
  const task = id === undefined ? undefined : BUILT_IN[id];
  return id === undefined || task === undefined ? null : { href: `#${id}`, title: text(task.title) };
});
const statusText = computed(() => {
  const s = props.state;
  if (s.verdict !== null) return "";
  if (s.phase === "running")
    return tests.value > 1 ? t("running-test", { n: s.test, count: tests.value }) : t("phase-running");
  if (s.phase === "paused") return t("phase-paused", { commands: s.run?.commands ?? 0 });
  return s.phase === "edit" ? t("phase-edit") : "";
});
// Every new verdict is announced, also the same text again (a second press of Start with the same mistake).
watch(
  () => props.state.verdict,
  (verdict) => {
    if (verdict !== null) announce(verdictText.value);
  },
);
// One step: where Kiko is now. A run that pauses: that it paused.
watch(
  () => [props.state.phase, props.state.run?.commands] as const,
  ([phase], [before]) => {
    if (phase === "paused") announce(`${statusText.value} ${description.value}`);
    else if (phase === "running" && before !== "running") announce(t("phase-running"));
  },
);

const backHref = computed(() => {
  const back = c.value?.back;
  if (back === undefined || c.value === null) return null;
  const url = typeof back.url === "string" ? back.url : text(back.url);
  return `${origin.value}${url}#werkstatt=${c.value.id}:${props.state.solved ? "geloest" : "offen"}`;
});
const result = computed(() =>
  c.value === null
    ? ""
    : t(props.state.solved ? "result-solved" : "result-open", {
        id: c.value.id,
        title: text(c.value.title),
        attempts: props.state.attempts,
      }),
);
const hintList = ref<HTMLOListElement | null>(null);
const tabButtons = ref<HTMLButtonElement[]>([]);
/** The tabs of the puzzles: arrow keys, Home and End move between them (WAI-ARIA tabs pattern). */
async function onTabKey(event: KeyboardEvent): Promise<void> {
  if (props.state.phase === "running") return;
  const n = props.state.test;
  const last = tests.value;
  const next =
    event.key === "ArrowRight"
      ? (n % last) + 1
      : event.key === "ArrowLeft"
        ? ((n + last - 2) % last) + 1
        : event.key === "Home"
          ? 1
          : event.key === "End"
            ? last
            : 0;
  if (next === 0) return;
  event.preventDefault();
  act("testfall", next);
  await nextTick();
  tabButtons.value[next - 1]?.focus();
}
/** Shows the next hint, announces it, and keeps the focus in the hints when its button goes. */
async function nextHint(): Promise<void> {
  const next = c.value?.hints[props.state.hints];
  act("hinweis");
  if (next !== undefined) announce(text(next));
  await nextTick();
  if (c.value !== null && props.state.hints >= c.value.hints.length) hintList.value?.focus();
}
const copyMissing = ref(false);
async function copy(): Promise<void> {
  if (copyText === undefined) {
    copyMissing.value = true;
    return;
  }
  await copyText(result.value);
  copied.value = true;
  announce(t("copied"));
}
const onProgram = (program: Program): void => {
  act("programm", program as unknown as Json);
  if (taskKey.value !== null) memory?.keep(taskKey.value, program);
};
watch(taskKey, remember);
watch(
  () => props.state.solved,
  (solved) => {
    if (solved && taskKey.value !== null) memory?.markSolved(taskKey.value);
  },
);
/** The program the editor starts with: the one saved for this task, else the challenge's own. */
const editorStart = computed(() =>
  saved.value !== null && saved.value.key === taskKey.value && saved.value.program !== undefined
    ? saved.value.program
    : (c.value?.start ?? null),
);
const solvedBefore = computed(() => saved.value !== null && saved.value.key === taskKey.value && saved.value.solved);
</script>

<template>
  <section class="werkstatt" :aria-label="t('app')">
    <p class="rotate-hint">{{ t("rotate-hint") }}</p>
    <Authoring v-if="c === null && state.draft !== null" :state="state" :lang="lang" @input="emit('input', $event)" />
    <div v-else-if="c === null" class="problems" role="alert">
      <h2>{{ t("problems-title") }}</h2>
      <ul>
        <li v-for="(p, i) in state.problems" :key="i">
          {{ p.path === "" ? say(p) : t("problem-at", { path: p.path, what: say(p) }) }}
        </li>
      </ul>
      <p>{{ t("problems-more") }}</p>
    </div>
    <template v-else>
      <p v-if="state.draft !== null">
        <button type="button" @click="act('bearbeiten')">← {{ t("authoring-back") }}</button>
      </p>
      <header class="task">
        <a v-if="backHref !== null && c.back !== undefined" class="back-top" :href="backHref"
          >← {{ text(c.back.label) }}</a
        >
        <h2>
          {{ text(c.title) }} <span v-if="solvedBefore" class="solved-before">✓ {{ t("solved-before") }}</span>
        </h2>
        <p>{{ text(c.task) }}</p>
        <p class="meta">
          <span>{{
            c.limits.blocks === undefined
              ? t("blocks-count-free", { used: state.blocks })
              : t("blocks-count", { used: state.blocks, max: c.limits.blocks })
          }}</span>
          <span v-if="tests > 1"> · {{ t("test-shown", { count: tests }) }}</span>
        </p>
        <p v-if="tests > 1">{{ t("tests-explain", { count: tests }) }}</p>
        <details class="help" :open="firstOfWorld">
          <summary>{{ t("help") }}</summary>
          <ul>
            <li>{{ t("help-blocks") }}</li>
            <li>{{ t("help-robot") }}</li>
            <li>{{ t(`help-map-${c.world.type}` as Key) }}</li>
            <li>{{ t("help-run") }}</li>
            <li>{{ t("help-keys") }}</li>
          </ul>
        </details>
        <details v-if="explained.length > 0" class="help" open>
          <summary>{{ t("new-blocks") }}</summary>
          <ul>
            <li v-for="(line, i) in explained" :key="i">{{ line }}</li>
          </ul>
        </details>
      </header>
      <div class="columns">
        <div class="stage">
          <div v-if="tests > 1" class="tabs" role="tablist" :aria-label="t('tests-label')" @keydown="onTabKey">
            <button
              v-for="n in tests"
              :id="`raetsel-tab-${n}`"
              :key="n"
              ref="tabButtons"
              type="button"
              role="tab"
              :aria-selected="state.test === n"
              aria-controls="raetsel-panel"
              :tabindex="state.test === n ? 0 : -1"
              :aria-disabled="state.phase === 'running'"
              :class="state.results[n - 1] ?? ''"
              @click="act('testfall', n)"
            >
              {{ t("test-n", { n }) }}
              <span v-if="state.results[n - 1] === 'ok'"
                ><span aria-hidden="true">✓</span><span class="sr-only">{{ t("test-ok") }}</span></span
              >
              <span v-else-if="state.results[n - 1] === 'fail'"
                ><span aria-hidden="true">✗</span><span class="sr-only">{{ t("test-fail") }}</span></span
              >
            </button>
          </div>
          <div
            id="raetsel-panel"
            :role="tests > 1 ? 'tabpanel' : undefined"
            :aria-labelledby="tests > 1 ? `raetsel-tab-${state.test}` : undefined"
          >
            <component
              :is="view"
              v-if="view !== undefined && worldState !== null && config !== null"
              :config="config"
              :state="worldState"
              :crashed="state.run?.status === 'crashed'"
              :label="description"
              :still="still"
            />
          </div>
          <div class="controls">
            <button type="button" class="primary" :aria-disabled="state.phase === 'running'" @click="act('start')">
              {{ state.phase === "paused" ? t("continue") : t("run") }}
            </button>
            <button type="button" @click="act('schritt')">{{ t("step") }}</button>
            <button type="button" :aria-disabled="state.phase !== 'running'" @click="act('stopp')">
              {{ t("stop") }}
            </button>
            <button
              type="button"
              :aria-disabled="state.run === null && state.verdict === null"
              @click="act('zuruecksetzen')"
            >
              {{ t("reset") }}
            </button>
            <label class="tempo">
              {{ t("tempo") }}
              <span aria-hidden="true">{{ t("tempo-slow") }}</span>
              <input
                type="range"
                min="1"
                max="5"
                :value="state.tempo"
                :aria-valuetext="
                  state.tempo <= 2 ? t('tempo-slow') : state.tempo >= 4 ? t('tempo-fast') : String(state.tempo)
                "
                :aria-label="t('tempo')"
                @input="act('tempo', Number(($event.target as HTMLInputElement).value))"
              />
              <span aria-hidden="true">{{ t("tempo-fast") }}</span>
            </label>
          </div>
          <p class="status">{{ statusText }}</p>
          <div v-if="state.verdict !== null" class="verdict" :class="state.verdict.ok ? 'ok' : 'fail'">
            <p>{{ verdictText }}</p>
            <p v-if="state.verdict.ok">
              {{ state.attempts <= 1 ? t("solved-first") : t("solved-attempts", { attempts: state.attempts }) }}
            </p>
            <p v-if="next !== null">
              <a :href="next.href">{{ t("next", { title: next.title }) }} →</a>
            </p>
            <p v-else-if="lastOfCollection">{{ t("all-done") }}</p>
          </div>
          <div v-if="c.hints.length > 0" class="hints">
            <ol v-if="state.hints > 0" ref="hintList" tabindex="-1" :aria-label="t('hints')">
              <li v-for="(hint, i) in c.hints.slice(0, state.hints)" :key="i">{{ text(hint) }}</li>
            </ol>
            <button v-if="state.hints < c.hints.length" type="button" @click="nextHint">
              {{ t("hint-show", { n: state.hints + 1, count: c.hints.length }) }}
            </button>
          </div>
        </div>
        <p class="scroll-hint">{{ t("scroll-hint") }}</p>
        <div class="workbench">
          <Editor
            :key="`${state.source}:${c.id}:${saved?.key ?? ''}`"
            :lang="lang"
            :toolbox="c.toolbox"
            :start="editorStart"
            :restored="editorStart !== c.start"
            :highlight="highlight"
            @program="onProgram"
          />
        </div>
      </div>
      <footer v-if="backHref !== null || state.verdict !== null" class="back">
        <a v-if="backHref !== null && c.back !== undefined" :href="backHref">← {{ text(c.back.label) }}</a>
        <p v-if="state.attempts > 0 && state.verdict !== null" class="result">
          <span>{{ t("back-result") }}: </span><output>{{ result }}</output>
          <button type="button" @click="copy">{{ copied ? t("copied") : t("copy") }}</button>
          <span v-if="copyMissing">{{ t("copy-missing") }}</span>
        </p>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.werkstatt h2 {
  margin: 0 0 0.25rem;
}
.solved-before {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2f7d32;
}
.task p {
  margin: 0.25rem 0;
}
.meta {
  color: var(--muted, #555);
}
.columns {
  display: grid;
  gap: 1rem;
  margin-top: 0.75rem;
}
@media (min-width: 52rem), (orientation: landscape) and (min-width: 36rem) {
  .columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
    align-items: start;
  }
}
.scroll-hint {
  display: none;
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted, #555);
}
@media (max-width: 36rem) {
  .scroll-hint {
    display: block;
  }
}
.rotate-hint {
  display: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
  background: #fff4c2;
  color: #3b2f00;
}
@media (orientation: portrait) and (max-width: 36rem) {
  .rotate-hint {
    display: block;
  }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 2px solid #1f2a44;
  margin-bottom: 0.25rem;
}
.tabs button {
  border-radius: 0.4rem 0.4rem 0 0;
  border-bottom: none;
  margin-bottom: -2px;
}
.tabs button[aria-selected="true"] {
  background: #1f2a44;
  color: #fff;
}
.tabs button.ok span {
  color: #2f7d32;
}
.tabs button.fail span {
  color: #c0182c;
}
.tabs button[aria-selected="true"] span {
  color: inherit;
}
.controls,
.hints {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  align-items: center;
}
button {
  min-height: 2.75rem;
  padding: 0.4rem 0.9rem;
  font: inherit;
  border-radius: 0.4rem;
  border: 1px solid #1f2a44;
  background: #fff;
  color: #1f2a44;
  cursor: pointer;
}
button.primary {
  background: #2f7d32;
  border-color: #2f7d32;
  color: #fff;
}
button[aria-pressed="true"] {
  background: #1f2a44;
  color: #fff;
}
button[aria-disabled="true"] {
  opacity: 0.55;
  cursor: default;
}
.tempo {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}
.status {
  min-height: 1.5em;
}
.verdict {
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
  border-left: 0.35rem solid;
}
.verdict p {
  margin: 0.25rem 0;
}
.verdict.ok {
  background: #e3f4e1;
  border-color: #2f7d32;
  color: #173d19;
}
.verdict.fail {
  background: #fde7e3;
  border-color: #c0182c;
  color: #4d0a12;
}
.hints ol {
  flex-basis: 100%;
  margin: 0;
}
.workbench {
  border: 1px solid #c9c9c9;
  border-radius: 0.4rem;
  overflow: hidden;
  background: #fff;
}
.back {
  margin-top: 1rem;
}
.back-top {
  display: inline-block;
  margin-bottom: 0.5rem;
}
.help {
  margin: 0.5rem 0;
}
.help summary {
  cursor: pointer;
  font-weight: 600;
}
.help ul {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
}
.result {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
