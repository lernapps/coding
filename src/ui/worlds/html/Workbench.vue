<script setup lang="ts">
// World "html" (spike): two text fields for HTML and CSS and a preview. The preview is an <iframe sandbox> without
// "allow-scripts" (nothing of the learner's code runs) and with "allow-same-origin" only so that this component can
// read its DOM; a Content-Security-Policy in its srcdoc forbids every request but inline styles and the app's own
// images, and the code is cleaned first (no script, meta, base, link, frames, objects). "Prüfen" reads the preview's
// DOM (elements, attributes, own text, computed styles) and sends it to the core, which checks it.
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import { STYLES, type Node } from "../../../core/worlds/html.ts";
import { texts } from "../../texts.ts";

const props = defineProps<{
  code: { html: string; css: string };
  lang: string;
  start: { html: string; css: string };
}>();
const emit = defineEmits<{ code: [code: { html: string; css: string }]; check: [dom: Node] }>();
const { t } = texts(props.lang);
const frame = useTemplateRef<HTMLIFrameElement>("frame");
const html = ref(props.code.html);
const css = ref(props.code.css);
const srcdoc = ref("");

const POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:";
const DROP = "script, meta, base, link, iframe, frame, frameset, object, embed, form, noscript, template";

/** The learner's HTML without what could run, load or navigate; event attributes and javascript: links removed. */
function clean(source: string): string {
  const doc = new DOMParser().parseFromString(`<body>${source}</body>`, "text/html");
  for (const el of doc.querySelectorAll(DROP)) el.remove();
  for (const el of doc.body.querySelectorAll("*"))
    for (const attr of [...el.attributes])
      if (/^on/i.test(attr.name) || /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
  // A link would navigate the preview away (and load a page): it opens a new window instead, which the sandbox forbids.
  for (const a of doc.body.querySelectorAll("a, area")) a.setAttribute("target", "_blank");
  // Serialized node by node; it goes only into the sandboxed srcdoc, never into this page.
  const out = new XMLSerializer();
  return [...doc.body.childNodes].map((n) => out.serializeToString(n)).join("");
}
const build = (): string =>
  `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${POLICY}">` +
  `<style>body{font-family:sans-serif;margin:8px}</style><style>${css.value.replace(/<\/style/gi, "<\\/style")}</style>` +
  `</head><body>${clean(html.value)}</body></html>`;

let timer: ReturnType<typeof setTimeout> | undefined;
function changed(): void {
  emit("code", { html: html.value, css: css.value });
  clearTimeout(timer);
  timer = setTimeout(() => (srcdoc.value = build()), 300);
}
onMounted(() => (srcdoc.value = build()));
watch(
  () => props.code,
  (c) => {
    if (c.html === html.value && c.css === css.value) return;
    html.value = c.html;
    css.value = c.css;
    srcdoc.value = build();
  },
);

/** The preview's body as a tree: tag, attributes, own text, the computed styles the checks know. */
function snapshot(el: Element, view: Window): Node {
  const style = view.getComputedStyle(el);
  const own = [...el.childNodes]
    .filter((n) => n.nodeType === 3)
    .map((n) => (n.textContent ?? "").trim())
    .filter((s) => s !== "")
    .join(" ");
  return {
    tag: el.tagName.toLowerCase(),
    attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
    text: own.slice(0, 200),
    style: Object.fromEntries(STYLES.map((p) => [p.replace("-top", ""), style.getPropertyValue(p)])),
    children: [...el.children].slice(0, 200).map((c) => snapshot(c, view)),
  };
}
function check(): void {
  clearTimeout(timer);
  srcdoc.value = build();
  // srcdoc renders asynchronously: read the DOM once the frame has loaded
  const f = frame.value;
  if (f === null) return;
  f.addEventListener(
    "load",
    () => {
      const doc = f.contentDocument;
      const view = f.contentWindow;
      if (doc !== null && view !== null) emit("check", snapshot(doc.body, view));
    },
    { once: true },
  );
}
function reset(): void {
  html.value = props.start.html;
  css.value = props.start.css;
  changed();
}
const rows = computed(() => Math.min(14, Math.max(6, html.value.split("\n").length + 1)));
</script>

<template>
  <div class="html-world">
    <p class="help">{{ t("html-help") }}</p>
    <div class="code">
      <label>
        <span>{{ t("html-code") }}</span>
        <textarea v-model="html" :rows="rows" spellcheck="false" autocapitalize="off" @input="changed" />
      </label>
      <label>
        <span>{{ t("css-code") }}</span>
        <textarea v-model="css" :rows="rows" spellcheck="false" autocapitalize="off" @input="changed" />
      </label>
    </div>
    <p class="actions">
      <button type="button" class="primary" @click="check">{{ t("html-check") }}</button>
      <button type="button" @click="reset">{{ t("html-reset") }}</button>
    </p>
    <section class="preview" :aria-label="t('html-preview')">
      <h3>{{ t("html-preview") }}</h3>
      <iframe
        ref="frame"
        :title="t('html-preview')"
        sandbox="allow-same-origin"
        referrerpolicy="no-referrer"
        :srcdoc="srcdoc"
      />
    </section>
  </div>
</template>

<style scoped>
.code {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 0.75rem;
}
.code label {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  gap: 0.25rem;
}
textarea {
  font:
    0.95rem/1.4 ui-monospace,
    monospace;
  padding: 0.5rem;
  border: 1px solid #1f2a44;
  border-radius: 0.4rem;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
}
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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
.preview h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1rem;
}
iframe {
  width: 100%;
  height: 16rem;
  border: 2px solid #b9b4a5;
  border-radius: 0.4rem;
  background: #fff;
}
</style>
