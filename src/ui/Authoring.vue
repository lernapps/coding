<script setup lang="ts">
// The authoring page (route "autoren"): an author pastes a challenge as JSON, sees its problems by field, tries it out
// and copies its link (German and English app page). The draft lives in the core's state; this component only packs
// the link.
import { computed, onMounted, ref, watch } from "vue";
import { announce } from "@lernapps/tooling/a11y";
import type { Input } from "@lernapps/app-templates/interactive";
import { MAX_LINK } from "../core/challenge.ts";
import type { State } from "../core/index.ts";
import { BUILT_IN } from "../data/index.ts";
import { linkOf } from "./address.ts";
import { texts } from "./texts.ts";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const { t, say } = texts(props.lang);

const pages = ref<{ de: string; en: string } | null>(null);
const links = ref<{ de: string; en: string } | null>(null);
const schema = ref("");
const script = ref("");
let copyText: ((value: string) => Promise<void>) | undefined;

onMounted(() => {
  // On lernapps.net (a preview too) the links name the workshop's fixed address; elsewhere (a local build) this one.
  const local = `${location.origin}${location.pathname.replace(/(en\/)?app\/$/, "")}`;
  const onPlatform = location.hostname === "lernapps.net" || location.hostname.endsWith(".lernapps.net");
  const root = onPlatform ? "https://lernapps.net/coding/" : local;
  pages.value = { de: `${root}app/`, en: `${root}en/app/` };
  schema.value = `${root}schemas/challenge.v1.schema.json`;
  script.value = `${root}tools/challenge-check.v1.mjs`;
  if (navigator.clipboard !== undefined) copyText = (value) => navigator.clipboard.writeText(value);
});

const valid = computed(() => props.state.problems.length === 0);
watch(
  () => [props.state.draft, valid.value, pages.value] as const,
  async ([draft, ok, page]) => {
    if (!ok || draft === null || page === null) {
      links.value = null;
      return;
    }
    links.value = { de: await linkOf(page.de, draft), en: await linkOf(page.en, draft) };
  },
  { immediate: true },
);
const length = computed(() => (links.value === null ? 0 : links.value.de.length - links.value.de.indexOf("?c=") - 3));

const examples = ["labyrinth-2", "turtle-3"] as const;
const load = (id: string): void =>
  emit("input", { kind: "action", name: "entwurf", value: JSON.stringify(BUILT_IN[id], null, 2) });
async function copy(link: string): Promise<void> {
  if (copyText === undefined) return;
  await copyText(link);
  announce(t("copied"));
}
</script>

<template>
  <section class="authoring" :aria-label="t('authoring')">
    <h2>{{ t("authoring") }}</h2>
    <p>{{ t("authoring-intro") }}</p>
    <ul>
      <li>
        {{ t("authoring-schema") }} <a :href="schema">{{ schema }}</a>
      </li>
      <li>{{ t("authoring-language") }}</li>
      <li>
        {{ t("authoring-script") }} <code>node challenge-check.v1.mjs aufgabe.json loesung.json</code> (<a
          :href="script"
          >{{ script }}</a
        >)
      </li>
    </ul>
    <p class="examples">
      <span>{{ t("authoring-examples") }}</span>
      <button v-for="id in examples" :key="id" type="button" @click="load(id)">{{ id }}</button>
    </p>
    <label class="draft">
      {{ t("authoring-draft") }}
      <textarea
        :value="state.draft ?? ''"
        rows="18"
        spellcheck="false"
        @input="emit('input', { kind: 'action', name: 'entwurf', value: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>
    <div v-if="!valid" class="problems" role="status">
      <p>{{ t("authoring-problems", { count: state.problems.length }) }}</p>
      <ul>
        <li v-for="(p, i) in state.problems" :key="i">
          {{ p.path === "" ? say(p) : t("problem-at", { path: p.path, what: say(p) }) }}
        </li>
      </ul>
    </div>
    <p v-else class="ok" role="status">{{ t("authoring-valid") }}</p>
    <p>
      <button
        type="button"
        class="primary"
        :disabled="!valid"
        @click="emit('input', { kind: 'action', name: 'ausprobieren' })"
      >
        {{ t("authoring-try") }}
      </button>
    </p>
    <div v-if="links !== null" class="links">
      <p>{{ t("authoring-length", { length, max: MAX_LINK }) }}</p>
      <p v-if="length > MAX_LINK" class="problems">{{ t("problem-too-long", { max: MAX_LINK }) }}</p>
      <p v-for="l in ['de', 'en'] as const" :key="l" class="link">
        <span>{{ t(`authoring-link-${l}`) }}</span>
        <output>{{ links[l] }}</output>
        <button type="button" @click="copy(links[l])">{{ t("copy") }}</button>
      </p>
    </div>
  </section>
</template>

<style scoped>
.draft {
  display: block;
  font-weight: 600;
}
textarea {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
  font:
    0.85rem/1.4 ui-monospace,
    monospace;
  box-sizing: border-box;
}
.problems {
  color: #4d0a12;
  background: #fde7e3;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
}
.ok {
  color: #173d19;
  background: #e3f4e1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
}
.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.link output {
  display: block;
  overflow-wrap: anywhere;
  font:
    0.8rem ui-monospace,
    monospace;
  margin: 0.25rem 0;
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
button:disabled {
  opacity: 0.55;
}
</style>
