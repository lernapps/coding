<script setup lang="ts">
// The root component: the challenge (title, task, limits), the world with its controls and the feedback per test case,
// the block editor (loaded on demand), hints and the way back. It shows the core's state and sends actions; it keeps
// no state of the task itself.
import { computed, defineAsyncComponent, h, onMounted, ref, watch } from "vue";
import { announce, prefersReducedMotion } from "@lernapps/tooling/a11y";
import type { Input, Json } from "@lernapps/app-templates/interactive";
import { configAt, MAX_LINK, testCount } from "../core/challenge.ts";
import type { State } from "../core/index.ts";
import { currentBlock } from "../core/interpreter.ts";
import type { Program } from "../core/ir.ts";
import type { Msg } from "../core/json.ts";
import { worldOf } from "../core/worlds/index.ts";
import { BUILT_IN, ROUTES } from "../data/index.ts";
import { readChallenge } from "./address.ts";
import { texts, type Key } from "./texts.ts";
import de from "../messages/de.json";
import { VIEWS } from "./worlds/index.ts";

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
const still = ref(false);
let copyText: ((value: string) => Promise<void>) | undefined;
const copied = ref(false);

onMounted(async () => {
  if (location.hostname === "lernapps.net" || location.hostname.endsWith(".lernapps.net"))
    origin.value = location.origin;
  still.value = prefersReducedMotion();
  if (navigator.clipboard !== undefined) copyText = (value) => navigator.clipboard.writeText(value);
  // TODO(lernapps/app-templates#201): read by the runtime and given to start() once it passes the address's parameters.
  const found = await readChallenge(location.search, MAX_LINK);
  if (found !== undefined) act("challenge", found as Json);
  addEventListener("hashchange", () => {
    if (props.state.source !== "address") return;
    history.replaceState(null, "", location.pathname + location.hash);
    act("route", decodeURIComponent(location.hash.slice(1)));
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
  return say(msg) + goal;
});
const highlight = computed(() =>
  props.state.run !== null && props.state.phase !== "edit" ? currentBlock(props.state.run) : null,
);
const verdictText = computed(() => {
  const v = props.state.verdict;
  if (v === null) return "";
  if (v.ok) return tests.value > 1 ? t("solved-all", { count: tests.value }) : t("solved");
  const why = say(v.why ?? ({ key: "fail-limit" } as Msg));
  return v.test === 0 || tests.value === 1 ? why : t("failed-test", { n: v.test, why });
});
/** Explanations of the blocks of this task that are more than a command. */
const explained = computed(() =>
  (c.value?.toolbox ?? []).filter((b) => `explain-${b}` in de).map((b) => t(`explain-${b}` as Key)),
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
  if (s.phase === "running") return t("phase-running");
  if (s.phase === "paused") return t("phase-paused", { commands: s.run?.commands ?? 0 });
  return s.phase === "edit" ? t("phase-edit") : "";
});
watch(verdictText, (value) => {
  if (value !== "") announce(value);
});

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
async function copy(): Promise<void> {
  if (copyText === undefined) return;
  await copyText(result.value);
  copied.value = true;
  announce(t("copied"));
}
const onProgram = (program: Program): void => act("programm", program as unknown as Json);
</script>

<template>
  <section class="werkstatt" :aria-label="t('app')">
    <p class="rotate-hint">{{ t("rotate-hint") }}</p>
    <div v-if="c === null" class="problems" role="alert">
      <h2>{{ t("problems-title") }}</h2>
      <ul>
        <li v-for="(p, i) in state.problems" :key="i">
          {{ p.path === "" ? say(p) : t("problem-at", { path: p.path, what: say(p) }) }}
        </li>
      </ul>
      <p>{{ t("problems-more") }}</p>
    </div>
    <template v-else>
      <header class="task">
        <a v-if="backHref !== null && c.back !== undefined" class="back-top" :href="backHref"
          >← {{ text(c.back.label) }}</a
        >
        <h2>{{ text(c.title) }}</h2>
        <p>{{ text(c.task) }}</p>
        <p class="meta">
          <span>{{
            c.limits.blocks === undefined
              ? t("blocks-count-free", { used: state.blocks })
              : t("blocks-count", { used: state.blocks, max: c.limits.blocks })
          }}</span>
          <span v-if="tests > 1"> · {{ t("test-shown", { n: state.test, count: tests }) }}</span>
        </p>
        <p v-if="tests > 1">{{ t("tests-explain", { count: tests }) }}</p>
        <details class="help" :open="state.source === 'route' && c.id === ROUTES[0]">
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
          <component
            :is="view"
            v-if="view !== undefined && worldState !== null && config !== null"
            :config="config"
            :state="worldState"
            :crashed="state.run?.status === 'crashed'"
            :label="description"
            :still="still"
          />
          <div v-if="tests > 1" class="tests" role="group" :aria-label="t('tests-label')">
            <button
              v-for="n in tests"
              :key="n"
              type="button"
              :aria-pressed="state.test === n"
              :disabled="state.phase === 'running'"
              @click="act('testfall', n)"
            >
              {{ t("test-n", { n }) }}
            </button>
          </div>
          <div class="controls">
            <button type="button" class="primary" :disabled="state.phase === 'running'" @click="act('start')">
              {{ state.phase === "paused" ? t("continue") : t("run") }}
            </button>
            <button type="button" @click="act('schritt')">{{ t("step") }}</button>
            <button type="button" :disabled="state.phase !== 'running'" @click="act('stopp')">{{ t("stop") }}</button>
            <button
              type="button"
              :disabled="state.run === null && state.verdict === null"
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
            <button
              v-if="!state.verdict.ok && state.verdict.test > 0 && state.verdict.test !== state.test"
              type="button"
              @click="act('testfall', state.verdict.test)"
            >
              {{ t("show-test", { n: state.verdict.test }) }}
            </button>
          </div>
          <div v-if="c.hints.length > 0" class="hints">
            <ol v-if="state.hints > 0" :aria-label="t('hints')">
              <li v-for="(hint, i) in c.hints.slice(0, state.hints)" :key="i">{{ text(hint) }}</li>
            </ol>
            <button v-if="state.hints < c.hints.length" type="button" @click="act('hinweis')">
              {{ t("hint-show", { n: state.hints + 1, count: c.hints.length }) }}
            </button>
          </div>
        </div>
        <div class="workbench">
          <Editor
            :key="`${state.source}:${c.id}`"
            :lang="lang"
            :toolbox="c.toolbox"
            :start="c.start"
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
        </p>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.werkstatt h2 {
  margin: 0 0 0.25rem;
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
.tests,
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
button:disabled {
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
