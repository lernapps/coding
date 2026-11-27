---
# Read by the hooks, the review, the evals. Schema: @lernapps/tooling/guidance/plan-front-matter.v1.schema.json
# Written by `lernapps plan` and the hooks. Never change a key or a value by hand.
# Archetype, as in the app's first plan. Allowed values: explainer, interactive, quiz.
archetype: interactive
# Current phase. Allowed values: explore, plan, code, commit.
phase: code
# prePushFailures: failed pre-push runs of this increment, written by the hook.
prePushFailures: 0
# failedChecks: failed rules and runs, written by lernapps check and the hooks.
failedChecks: { checks-pass: 1 }
---

# Increment: vorhersagen

<!--
For you, the assistant. One increment of a published app: new competencies, chapters, pages, rounds, questions, or a
correction. The process is in AGENTS.md; this plan holds the method.
- `npx --no -- lernapps plan next` prints the task to do now, `plan done` ticks it and prints the next one.
- You write only below Goal, Key decisions, Notes, Answers, Content method and Retrospective, in the creator's
  language. Delete the comment of a section once the section is filled.
- The first version's decisions stand: archetype, content method, content guide. Never change an earlier plan.
- Work on the branch `increment/<NN>-<short name>`. Until Commit everything is local: push nothing.
-->

*Started 2026-11-26. Explore, Plan, Code, Commit.*

## Goal

Lernende lesen ein fertiges Programm und sagen voraus, was Kiko tut: im Labyrinth den Weg Feld für Feld, bei Turtle
das Bild unter mehreren. Dann läuft das Programm, und die Rückmeldung nennt den ersten Schritt, an dem Vorhersage und
Lauf auseinandergehen.

## Key decisions

- Branch heißt `increment/vorhersagen` (nicht `increment/02-vorhersagen`), wie der Orchestrator ihn vorgibt.
- `lernapps update` (tooling 0.20.2, app-templates 0.24.0) gleich zu Beginn, auf Ansage des Orchestrators.
  `arc42 diff --staged` meldete Prosa ohne Block in `06-runtime-view` (Szenario „pages“, Sprachwechsel trägt Suche und
  Hash). Das ist der generische Teil, den das Update selbst ersetzt, nicht der Teil der App: angenommen mit
  `ARC42_CONSISTENT=e8deefa…`.

## Notes

**Kompetenz** (Lernlandkarte Informatik, Strang `algorithmen`, geöffnet 2026-11-26):

- `algorithmus-ausfuehren` – „Ich kann einen Algorithmus Schritt für Schritt von Hand ausführen und so sein Ergebnis
  ermitteln.“ Band 9-10, setzt `wiederholung-mit-bedingung` voraus. Bisher übt sie keine App (`practisedBy` leer).
  Die Werkstatt ist für 7-8 gedacht; die Aufgaben nutzen nur Blöcke, die die Lernenden aus den Kapiteln vorher kennen.
  Der Katalogeintrag bekommt damit auch Band 9-10 (Folge für den Eintrag, den lernapps/apps selbst aktualisiert).

**Didaktik:**

- Lesen vor Schreiben: Lernende verfolgen ein Programm im Kopf, das sie nicht selbst gebaut haben (Prinzip
  „Predict – Run“). Das Programm ist ganz gesperrt; es gibt keine Toolbox.
- Labyrinth: Das Kind setzt die Felder, durch die Kiko geht, der Reihe nach. Ein Schritt ist ein Feldwechsel
  („gehe vorwärts“); Drehungen ändern das Feld nicht. Rückmeldung: „Bis Schritt 3 stimmt deine Vorhersage. Bei Schritt
  4 geht Kiko nach Feld (4|2), du hast Feld (3|3) gesetzt.“ Auch: Kiko stößt an eine Wand (die Vorhersage geht weiter),
  der Weg ist kürzer oder länger als vorhergesagt.
- Turtle: drei bis vier Bilder zur Wahl, eines richtig; die falschen schreibt der Autor als Programme mit typischen
  Fehlern (links statt rechts, eine Wiederholung zu wenig, Stift zu früh oben). Rückmeldung: „Bis Linie 3 stimmt dein
  Bild. Linie 4 zeichnet Kiko nach rechts, in deinem Bild geht sie nach unten.“
- Bedienung ohne Maus und ohne Bild: Pfeiltasten bewegen eine Markierung auf der Karte, Eingabe setzt das Feld,
  Rücktaste nimmt das letzte zurück; der Weg steht auch als Liste („1. Feld (2|3)“). Bilder sind Optionen mit
  Beschreibung (Zahl der Linien, Form).
- Ein Versuch ist ein Vergleich; danach ändert das Kind die Vorhersage und vergleicht neu. Mehrere Rätsel (Karten)
  wie bisher als Reiter; das Programm muss für jedes stimmen.

**Umfang** (guess): drei eingebaute Aufgaben nach `labyrinth-5`: `vorhersage-1` (Labyrinth, Zählschleife und
Drehung), `vorhersage-2` (Labyrinth, „solange“ mit „wenn“, zwei Rätsel), `vorhersage-3` (Turtle, Wiederholung mit
Drehung, vier Bilder). Nicht drin: Vorhersage von Zahlen oder Variablen, Vorhersagen in Ansichten (#495).

**Schema:** neue Prüfung `vorhersage` in `checks`, neues optionales Feld `vorhersage` (Turtle: `bilder`, die Programme
der falschen Bilder). v1 bleibt gültig, alte Links laufen.

**Quellen:** Lernlandkarte Informatik (geöffnet). Keine weiteren Fakten nötig: das Verhalten kommt aus dem
Interpreter der App.

## Explore

<!--
- All content questions belong here; Plan maps the answers onto the app. Ask; write no code.
- Skip what earlier answers or the app already tell. At most 2 questions per message, one topic each.
-->

### Tasks

- [x] Read the README of the archetype's template (its path is in skill `lernapps-app`): what the app can do now.
      Tell the creator what is new, if it matters for this increment.
- [x] Load the content guide `.agents/skills/app-content/SKILL.md` and read the earlier plans in `.vibe/plans/`: what
      the app teaches, how its content is made, what is open.
- [x] Interview, one topic per question, the creator's words under "Answers": which competencies, chapters or rounds,
      for which school years; hurdles and examples; the amount; any change of look and feel or of terms. No answer:
      ask once more, then write your assumption with "(guess)".
- [x] Load skill `lernapps-content-research`. Research what the content guide does not cover. Write under "Notes":
      the new competencies by chapter with their ids, the sources you opened.
- [x] Write under "Notes" the didactic approach per competency and the scope (in, out, data range).
- [x] The increment needs a kind of content the guide does not cover (a new page structure, screen, component or kind
      of exercise): load skills `lernapps-interactive-design` and `lernapps-exercise-patterns`. Else skip this task.
- [x] **Checkpoint:** research. Show in plain words: the new competencies by chapter, the didactic approach, the
      scope, every "(guess)", the sources and what is unchecked. Stop and wait. Changes: change them, then ask again.
      Creator: Orchestrator: Ja, so planen und bauen. Drei Aufgaben in dieser Reihenfolge, das ganze Programm gesperrt, Labyrinth Feld für Feld, Turtle mit 3–4 Bildern, Tastatur und Liste; algorithmus-ausfuehren und 9–10 im Eintrag passen.

### Answers

- Orchestrator (Freigabe (b)): Programm gesperrt; Kind wählt Zielfeld bzw. Bild, dann läuft das Programm zum
  Vergleich; Rückmeldung nennt den ersten Schritt, an dem Vorhersage und Lauf auseinandergehen; mit Tastatur, Zielfeld
  auch ohne Bild beschreibbar; neue Prüfung `vorhersage` im Schema, abwärtskompatibel.
- Labyrinth: „Weg Feld für Feld“.
- Turtle, falsche Bilder: „Autor schreibt sie“.

## Plan

<!--
- Map the new content onto the app with the guide's patterns. The creator confirms the plan in one read.
- After the yes you work on your own.
-->

### Tasks

- [x] Load skill `lernapps-content-growth`. Add the tasks of Code as slices, one per competency, in the guide's
      order, one call each: `npx --no -- lernapps plan add --at slices "<task>"`. Say in each which sub-agent may
      write it in parallel, if any.
- [x] Write "Content method": the guide's patterns, figures and components per slice. Anything new: map it as skill
      `lernapps-interactive-design` says, and say why the guide's patterns do not fit.
- [x] Draw a sketch of each new component or interactive exercise, in `.vibe/sketches/`.
- [x] Show the creator, short: goal, new competencies by chapter, slices; in plain words what learners see and do and
      what is new. At most 2 questions.
- [x] **Checkpoint:** confirm the plan and the content method. Stop and wait for an explicit yes. Changes: change
      them, then ask again.
      Creator: Orchestrator: Ja, so planen und bauen (Antwort zum Checkpoint Recherche; Zusätze des Plans per send_message gemeldet).

### Content method

- **Challenge-Muster** des Leitfadens bleibt (Welt, Aufgabe, Testfälle als Rätsel-Reiter, Hinweise, Rückmeldung je
  Rätsel). Neu ist die Art der Übung: lesen und vorhersagen statt bauen. Das Muster des Leitfadens erwartet ein
  Programm des Kindes; hier ist das Programm gegeben, deshalb ein neues Muster **Vorhersage**.
- **Kern:** Prüfung `vorhersage` in `checks`. Mit ihr ist das Programm das Startprogramm und fest: die Aktion
  `programm` ändert nichts. Neuer Zustand `predictions[]` je Rätsel: Labyrinth eine Liste von Feldern, Turtle die Nummer
  des gewählten Bildes. Aktionen `feld` („x,y“, nur ein Nachbarfeld des letzten), `zurueck`, `leeren`, `bild`.
  „Start“ prüft zuerst, ob jedes Rätsel eine Vorhersage hat, dann läuft das Programm wie bisher; `judgeRun` vergleicht
  Lauf und Vorhersage und nennt den ersten abweichenden Schritt (Labyrinth: Feldwechsel; Turtle: Linie).
- **Daten:** Feld `vorhersage` in der Challenge, Turtle: `{ "bilder": [Programm, …] }` (2–3 falsche Bilder; das
  richtige ist der Lauf des Programms). Reihenfolge der Bilder aus dem Seed. Labyrinth braucht kein Feld.
- **Oberfläche:** Labyrinth: die Karte nimmt Klicks auf Felder an; eine Markierung lässt sich mit Pfeiltasten bewegen,
  Eingabe setzt, Rücktaste nimmt zurück. Die Vorhersage steht als nummerierte Liste neben der Karte und als Ziffern auf
  den Feldern. Turtle: Bilder als Optionsfelder (radio), jedes mit Beschreibung „Linie 1: von (100|100) nach
  (100|50) …“. Der Editor zeigt das Programm nur zum Lesen (Blockly `readOnly`, keine Toolbox); darunter das Programm
  als Text, für Lernende ohne Bild.
- **Playthroughs:** je Aufgabe gelöst und ein typischer Fehler (Rückmeldung mit dem ersten abweichenden Schritt).
- **Routen:** `vorhersage-1` … `vorhersage-3` nach `labyrinth-5`.
- Kann nicht: Vorhersage von Zahlen oder Variablen; Vorhersage eines Laufs, der an eine Wand stößt (das Programm einer
  Vorhersage-Aufgabe muss bis zum Ende laufen; der Prüfer meldet es sonst dem Autor).

## Code

<!--
- Build locally on the branch, on your own. After each task: `plan done`, then one commit with the work and this
  plan. The hooks check each commit; a failing check is fixed from its message, as skill `lernapps-cli` says.
- What you cannot decide: choose, write it under "Key decisions" with "(guess)", go on.
- The creator asks for a change: say your reading in one sentence first.
-->

### Tasks

- [x] `git switch -c increment/<NN>-<short name>` from `main`. Commit this plan on it.
- [x] Load skill `lernapps-cli`. Update the app as its section "Update" says. Commit the update alone and fix its
      findings before any content. The update replaces the `lernapps-*` skills: read again those you use.
- [ ] Load skill `lernapps-interactive` and the content guide.
- [ ] Kern und Schema: Prüfung vorhersage, Feld vorhersage (Turtle: bilder), Aktionen zum Setzen und Vergleichen, erster abweichender Schritt, Rückmeldungen de/en, Tests, Prüfskript neu bauen (allein, kein Sub-Agent)
- [ ] Labyrinth-Vorhersage in der Oberfläche (Felder setzen mit Maus und Tastatur, Weg als Liste) und Aufgabe vorhersage-1 mit Musterlösung und zwei Playthroughs (allein)
- [ ] Aufgabe vorhersage-2 (Labyrinth, solange und wenn, zwei Rätsel) mit Playthroughs (allein)
- [ ] Turtle-Bildwahl in der Oberfläche und Aufgabe vorhersage-3 (vier Bilder) mit Playthroughs (allein)
<!-- tasks: slices (4 added): one per competency, as written in Plan -->
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
