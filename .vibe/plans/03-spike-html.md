---
# Read by the hooks, the review, the evals. Schema: @lernapps/tooling/guidance/plan-front-matter.v1.schema.json
# Written by `lernapps plan` and the hooks. Never change a key or a value by hand.
# Archetype, as in the app's first plan. Allowed values: explainer, interactive, quiz.
archetype: interactive
# Current phase. Allowed values: explore, plan, code, commit.
phase: explore
# prePushFailures: failed pre-push runs of this increment, written by the hook.
prePushFailures: 0
# failedChecks: failed rules and runs, written by lernapps check and the hooks.
failedChecks: { checks-pass: 1 }
---

# Increment: spike-html

<!--
For you, the assistant. One increment of a published app: new competencies, chapters, pages, rounds, questions, or a
correction. The process is in AGENTS.md; this plan holds the method.
- `npx --no -- lernapps plan next` prints the task to do now, `plan done` ticks it and prints the next one.
- You write only below Goal, Key decisions, Notes, Answers, Content method and Retrospective, in the creator's
  language. Delete the comment of a section once the section is filled.
- The first version's decisions stand: archetype, content method, content guide. Never change an earlier plan.
- Work on the branch `increment/<NN>-<short name>`. Until Commit everything is local: push nothing.
-->

*Started 2026-11-27. Explore, Plan, Code, Commit.*

## Goal

<!-- 1–2 sentences: what learners can do after this increment. -->

## Key decisions

<!-- One line each: decision and reason. Your own choice without the creator: mark "(guess)". -->

## Notes

**Spike „Welt HTML/CSS“** (Auftrag des Orchestrators nach der Entscheidung zu #504; Branch `increment/spike-html`).

Gebaut (Prototyp, Route `html-1` „Webseite 1: Deine erste Webseite (Test)“):

- Welt `html` Version 1 im Schema challenge.v1: `world.config` = `{ html, css, erwartet[] }`, `view: "text"`, `start:
  null`, Prüfung `dom-passt`; `toolbox` nennt Elemente und Eigenschaften nur zum Nachschlagen. Schema und Validator
  prüfen es; alte Challenges bleiben gültig (`view` bei anderen Welten weiter `bloecke`).
- Editor: zwei Textfelder (HTML, CSS), kein Blockly, keine Bibliothek. Tab verlässt das Feld (kein Einrücken per Tab).
- Vorschau: `<iframe sandbox="allow-same-origin" srcdoc>` ohne `allow-scripts`; CSP im srcdoc `default-src 'none';
  style-src 'unsafe-inline'; img-src 'self' data:`. Der Code wird vorher bereinigt (script, meta, base, link, iframe,
  object, embed, form …; on*-Attribute; javascript:-Links; Links öffnen in neuem Fenster, das die Sandbox verbietet).
  `allow-same-origin` ist nötig, damit die App das DOM lesen kann; ohne `allow-scripts` läuft trotzdem nichts.
- Prüfung: Die Oberfläche liest das DOM der Vorschau (Element, Attribute, eigener Text, 14 berechnete Stile) und
  schickt es als Aktion `pruefen` an den Kern; der Kern prüft `erwartet` mit eigenen Selektoren (Element, #id, .klasse,
  Nachfahre) und normalisierten Farben (Name, #rgb, rgb()), bold/normal. Der Kern bleibt ohne DOM, Playthroughs
  können ein DOM vorgeben.

Geprüft:

- Unit-Tests (Selektoren, Farben, Kern mit Code und Prüfung), Schema-Test; `lernapps check` (siehe Commit).
- Sicherheit (Playwright): `<script>`, `onerror`, `meta refresh`, `<iframe src>`, `<link>`, `@import`, Hintergrundbild
  und `<img>` von außen, Link mit `target="_self"`: kein Skript lief, keine Navigation; jede Anfrage nach außen
  scheiterte an der CSP („failed … csp“), keine erreichte das Netz.
- Budget: kein neues Paket. Hauptbundle 195,0 kB statt 181,0 kB (+14 kB unkomprimiert für Welt, Workbench, Texte,
  Schema-Teil). Die html-Aufgabe lädt nur dieses Bundle; der Blockly-Chunk (808 kB) wird dort nicht geladen.
- Tastatur: Tab-Reihenfolge HTML → CSS → Prüfen → Code zurücksetzen → Vorschau; 360, 740×360, 1280 px ohne seitliches
  Scrollen; de und en.

Ungeprüft:

- Echter Screenreader; Lernende; Geräte mit Bildschirmtastatur (Autokorrektur ist aus: spellcheck, autocapitalize).
- Browser außer Chromium (Firefox/Safari: CSP im srcdoc und `allow-same-origin` ohne Skripte sollten gleich wirken,
  nicht getestet).
- Ob die Regel `vue-component-no-html-injection` die Vorschau grundsätzlich erlaubt: Ich serialisiere mit
  XMLSerializer statt innerHTML; die Vorschau ist aber ihrem Wesen nach HTML aus Text (in einem sandboxed srcdoc).
  Plattformfrage.

Entscheidung (Vorschlag): ausbauen. HTML/CSS passt als Welt in challenge.v1 (eigene Ansicht `text`), sicher ohne
Skripte und ohne Netz, und die Prüfung über das DOM ist robust gegen Schreibweisen. Offen für den Ausbau: eine eigene Hilfe zur Welt
(die Kiko-Hilfe ist dort ausgeblendet), Syntaxfarben/Zeilennummern
(Bibliothek wie CodeMirror wäre +~150 kB; erst nach Lernenden-Check entscheiden), Selektoren mit `>`/`:nth-child`,
mehr Aufgaben, Playthroughs mit DOM, Autorenseite.

## Explore

<!--
- All content questions belong here; Plan maps the answers onto the app. Ask; write no code.
- Skip what earlier answers or the app already tell. At most 2 questions per message, one topic each.
-->

### Tasks

- [ ] Read the README of the archetype's template (its path is in skill `lernapps-app`): what the app can do now.
      Tell the creator what is new, if it matters for this increment.
- [ ] Load the content guide `.agents/skills/app-content/SKILL.md` and read the earlier plans in `.vibe/plans/`: what
      the app teaches, how its content is made, what is open.
- [ ] Interview, one topic per question, the creator's words under "Answers": which competencies, chapters or rounds,
      for which school years; hurdles and examples; the amount; any change of look and feel or of terms. No answer:
      ask once more, then write your assumption with "(guess)".
- [ ] Load skill `lernapps-content-research`. Research what the content guide does not cover. Write under "Notes":
      the new competencies by chapter with their ids, the sources you opened.
- [ ] Write under "Notes" the didactic approach per competency and the scope (in, out, data range).
- [ ] The increment needs a kind of content the guide does not cover (a new page structure, screen, component or kind
      of exercise): load skills `lernapps-interactive-design` and `lernapps-exercise-patterns`. Else skip this task.
- [ ] **Checkpoint:** research. Show in plain words: the new competencies by chapter, the didactic approach, the
      scope, every "(guess)", the sources and what is unchecked. Stop and wait. Changes: change them, then ask again.

### Answers

<!-- The creator's answers, in their words, one bullet each. -->

## Plan

<!--
- Map the new content onto the app with the guide's patterns. The creator confirms the plan in one read.
- After the yes you work on your own.
-->

### Tasks

- [ ] Load skill `lernapps-content-growth`. Add the tasks of Code as slices, one per competency, in the guide's
      order, one call each: `npx --no -- lernapps plan add --at slices "<task>"`. Say in each which sub-agent may
      write it in parallel, if any.
- [ ] Write "Content method": the guide's patterns, figures and components per slice. Anything new: map it as skill
      `lernapps-interactive-design` says, and say why the guide's patterns do not fit.
- [ ] Draw a sketch of each new component or interactive exercise, in `.vibe/sketches/`.
- [ ] Show the creator, short: goal, new competencies by chapter, slices; in plain words what learners see and do and
      what is new. At most 2 questions.
- [ ] **Checkpoint:** confirm the plan and the content method. Stop and wait for an explicit yes. Changes: change
      them, then ask again.

### Content method

<!-- One line each: the guide's patterns, figures and components used, and where; anything new, what it does and
cannot. Something new goes into the guide in the slice that adds it. -->

## Code

<!--
- Build locally on the branch, on your own. After each task: `plan done`, then one commit with the work and this
  plan. The hooks check each commit; a failing check is fixed from its message, as skill `lernapps-cli` says.
- What you cannot decide: choose, write it under "Key decisions" with "(guess)", go on.
- The creator asks for a change: say your reading in one sentence first.
-->

### Tasks

- [ ] `git switch -c increment/<NN>-<short name>` from `main`. Commit this plan on it.
- [ ] Load skill `lernapps-cli`. Update the app as its section "Update" says. Commit the update alone and fix its
      findings before any content. The update replaces the `lernapps-*` skills: read again those you use.
- [ ] Load skill `lernapps-interactive` and the content guide.
<!-- tasks: slices: one per competency, as written in Plan -->
- [ ] **Checkpoint:** the pattern page, after the first slice. A slice in a pattern the app already has: show it to
      the creator and go on. A new pattern: load skill `lernapps-learner-check`, do its learner check, fix what it
      finds, then ask the creator whether the others may follow it, and wait.
- [ ] Update the content guide so that it describes the app as it is now (`app-content-matches`).
- [ ] Run `npx --no -- lernapps check` until it passes.
- [ ] Look at every changed screen, at 360 px and on a desktop, as "Look at the app" of skill `lernapps-cli` says.

## Commit

<!--
- Publish with the creator's yes. A push to `main` publishes.
- Open the pull requests (to `main`, to the catalog) without asking: they publish nothing.
-->

### Tasks

- [ ] Load skill `lernapps-github`. Push the branch, open the preview pull request and see its checks to green, as it
      says.
- [ ] **Checkpoint:** publish. Show what the increment adds and the preview link. Ask whether it may go online. Stop
      and wait for the yes.
- [ ] Load skill `lernapps-commit`. Publish as skill `lernapps-github` says: the pull request squash-merged into
      `main`, the run of `Pages` watched to its end.
- [ ] Open the address the job `deploy` printed and confirm the new content. Never use a derived address.
- [ ] The app is listed and its entry changes (school years, summary): load skill `lernapps-listing` and write the
      changed entry. Else skip this task.
- [ ] Fill the retrospective.
- [ ] Commit this plan on `main` and push it. A push of only `.vibe/` publishes nothing.
- [ ] The entry changed: open the pull request to the catalog as skill `lernapps-listing` says, without asking first,
      and see it to "bestanden". Else skip this task: `npx --no -- lernapps plan skip "entry unchanged"`.
- [ ] **Checkpoint:** list. Tell the creator the result: the pull request and its result, or, when the entry did not
      change, that the catalog takes over the app by itself. Tick it with their reply.
- [ ] If the plan changed since its last push, commit it on `main` and push again.

## Retrospective

<!-- At the end of Commit. Facts, short, no names. Read by review and evals. -->

### Phases reached

<!-- Last phase completed, checkpoints passed. E.g. "commit; confirmed, published". -->

### Creator turns after the plan

<!-- Number of creator messages after the confirmation, topic of each. Target: at most 3. -->

### Where I had to guess

<!-- Each gap in plan, skills, content guide, messages or answers, and your choice. "None" if none. -->
