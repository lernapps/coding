---
# Read by the hooks, the review, the evals. Schema: @lernapps/tooling/guidance/plan-front-matter.v1.schema.json
# Written by `lernapps plan` and the hooks. Never change a key or a value by hand.
# Archetype, null until chosen in Explore. Allowed values: explainer, interactive, quiz.
archetype: interactive
# Current phase. Allowed values: explore, plan, code, commit.
phase: code
# prePushFailures: failed pre-push runs, written by the hook.
prePushFailures: 2
# failedChecks: failed rules and runs, written by lernapps check and the hooks.
failedChecks: { app-content-guide: 1, checks-pass: 11, plan-file: 1 }
---

# Plan: coding, first version

<!--
For you, the assistant. The process is in AGENTS.md; this plan holds the method.
- `npx --no -- lernapps plan next` prints the task to do now, `plan done` ticks it and prints the next one.
- You write only below Goal, Key decisions, Notes, Answers, Entry draft, Content method and Retrospective, in the
  creator's language. Delete the comment of a section once the section is filled.
- Work on the branch `work`, locally: push nothing before Commit.
-->

*Started 2026-11-26. Explore, Plan, Code, Commit.*

## Goal

Lernende (7-8, später 9-10) programmieren in der Programmierwerkstatt mit Blöcken einen Roboter im Labyrinth und eine Turtle, die zeichnet. Sie lernen Sequenz, Zählschleife, bedingte Wiederholung und Verzweigung. Andere Apps schicken der Werkstatt Challenges als Link; die Werkstatt prüft das Programm gegen alle Testfälle und führt zurück.


## Key decisions

- Archetyp `interactive`: Lernende handeln in einem eigenen Modell (Programm bauen, ausführen, Figur bewegt sich); Blockly passt nicht in eine Explainer-Komponente (20 kB). Quelle: Auftrag lernapps/apps#869.
- Blockly 13.4.0 als Bibliothek, exakt gepinnt (Apache 2.0); Tastatur-Navigation aus dem Kern von Blockly 13, kein Plugin. Spike, vom Orchestrator bestätigt.
- Blockly ist nur Eingabe: Ein eigener Generator macht aus den Blöcken ein Programm-IR (JSON) und schickt die Aktion `programm` an den Kern. Kein JavaScript aus Blöcken, kein `eval`.
- Der Kern führt das IR mit einem eigenen Interpreter Schritt für Schritt aus (ein Weltbefehl pro Schritt, Schrittlimit). Playthroughs schicken IR direkt.
- Welten sind TypeScript-Module im Repo (rein, ohne DOM) plus eine Vue-Ansicht; Challenges sind JSON nach `challenge.v1.schema.json`.
- Weg A (Challenge in der Adresse `?c=`): Übergangsschicht. Die Root-Komponente liest `?c=` und schickt die Aktion `challenge`; ersetzt durch `start(seed, route, params)`, sobald die Runtime es kann (Issue folgt vom Orchestrator).
- Weg B (eingebaute Sammlung): Routen `app/#<id>` aus `app.yaml`.
- Prüfung der Challenge zur Laufzeit mit eigenem Validator, nicht mit Ajv (Ajv erzeugt Code mit `new Function`). Ein Test hält Schema-Datei und Validator gleich. (guess)
- Blockly per dynamic import nachladen, mit Ladezustand mit Text. Erste Seite und nachgeladene Größe getrennt nennen.
- Auf schmalen Bildschirmen Kategorien statt Flyout; im Querformat Welt und Editor nebeneinander, im Hochformat Hinweis zum Drehen (nur Empfehlung, WCAG 1.3.4).
- Sprachen de und en (Nachtrag 1). Challenge-Texte als `{de, en}`, Deutsch Pflicht. Sprache aus der geöffneten Seite (`/en/app/?c=…`).
- Blockly-Medien selbst ausliefern (`public/blockly-media/`), `sounds: false`; ARIA-Workaround für das Flyout mit Link auf das Upstream-Problem.
- Grenze für `?c=`: 2000 Zeichen.
- `back.url` ist ein Pfad auf lernapps.net mit optionaler Query, ohne Fragment (`^/[a-z0-9/-]*/(\?[a-z0-9=&-]*)?$`). Herkunft: unter lernapps.net `location.origin`, sonst `https://lernapps.net`. (Orchestrator, Checkpoint 2)
- Prüfskript: kein npm-Paket; eine Datei ohne Abhängigkeiten mit Version im Namen, `coding/tools/challenge-check.v1.mjs`; ein neues Format kommt als `v2` daneben. (Orchestrator, Checkpoint 2)
- Welt-Ansicht getrennt vom Welt-Kern (Abweichung vom Entwurf), im arc42-Teil festgehalten. (Orchestrator, Checkpoint 2)
- Turtle `bild-gleich`: Hausdorff ≤ 2; die Rückmeldung sagt, wo das Bild abweicht. (Orchestrator, Checkpoint 2)
- Weg A über `start(seed, route, params)` (app-templates 0.21.0, #202): Der Kern entpackt `c` selbst (eigener DEFLATE-Leser, weil `start` synchron ist). `c` gilt für den ganzen Besuch (Vertrag der Runtime, ihr e2e-Test prüft es); ein Klick auf eine Route der Liste startet einen neuen Besuch ohne `c`. Abweichung von „die Route gewinnt“: Ein Link mit `?c=` und Hash zeigt die Challenge, weil die Runtime jede Seite mit Hash öffnet. (guess, an den Orchestrator gemeldet)
- Die Musterlösung steht nie im Link: Das Prüfskript bekommt Challenge und Lösung getrennt.


## Notes

**Lernlandkarte Informatik** (Strang `algorithmen`, Stand draft; Band 7-8, alle ohne App, also Lücken):

| id | Schritt | opens | in Stufe 1 |
|---|---|---|---|
| `sequenz` | 2 | 21 | Labyrinth 1, Turtle 1 |
| `visuelle-programmierung` | 3 | 12 | jede Challenge |
| `wiederholung-feste-anzahl` | 3 | 8 | Labyrinth 2, Turtle 2 und 3 |
| `verzweigung` | 3 | 8 | Labyrinth 3 |
| `wiederholung-mit-bedingung` | 4 | 7 | Labyrinth 3 |
| `programm-testen` (9-10) | 2 | 0 | nur indirekt: mehrere Testfälle je Challenge |

Später (eigene Inkremente): `struktogramm`, `pseudocode`, `textbasierte-programmierung`, `variable`, `unterprogramme`, `parameter` (9-10, Ansichten für #495); Welt Feld für #496.

**Wie Lernende üben** (exercise-patterns, Informatik; Archetyp interactive): Sie bauen ein Programm, führen es aus und sehen, was die Figur tut. Einzelschritt und Tempo zeigen, wie der Ablauf entsteht. Mehrere Testfälle je Challenge zwingen zu einer allgemeinen Lösung statt fest codierter Schritte.

**Je Kompetenz: Weg und Fehlvorstellung**
- `sequenz`: Befehle in Reihenfolge legen, laufen lassen, Figur verfolgen. Fehlvorstellung: links/rechts aus Sicht des Betrachters statt des Roboters. Rückmeldung: „Der Roboter schaut nach Süden. Für ihn ist links jetzt Osten.“
- `wiederholung-feste-anzahl`: Gang mit 4 Feldern bei höchstens 3 Blöcken; zweiter Testfall mit anderer Länge. Fehlvorstellung: falsche Anzahl (Zaunpfahl). Rückmeldung nennt Testfall und Feld.
- `wiederholung-mit-bedingung`: Gang unbekannter Länge (Testfälle mit 3, 5, 7 Feldern). Fehlvorstellung: Zählschleife reicht. Rückmeldung: „Testfall 2: Der Gang ist länger. Der Roboter bleibt in Feld 4 stehen.“
- `verzweigung`: an jeder Ecke abbiegen, `wenn Wand voraus dann … sonst …`. Fehlvorstellung: Bedingung nur einmal geprüft statt in der Schleife.
- `visuelle-programmierung`: Blöcke einfügen, verschachteln, ausführen, auch nur mit der Tastatur.

**Umfang Stufe 1**
- Drin: Welten Labyrinth und Turtle; je 3 eingebaute Challenges (Weg B); Weg A (`?c=`); Schema veröffentlicht; Autorenseite; Prüfskript; Rückweg mit `#werkstatt=<id>:<status>` und Ergebniszeile; Fortschritt (gelöste ids, letztes Programm je Challenge) im eigenen Speicher; de und en.
- Nicht drin: Welt Feld, Ansichten Struktogramm/Pseudocode/Text, Variablen- und Unterprogramm-Blöcke (das IR kann sie schon), echter Rückkanal, Block `werkstatt-link` im Explainer.
- Datenbereich: Labyrinth bis 12×12 Felder; Turtle-Fläche 200×200, Winkel in Grad, Längen 1–200; Schrittlimit je Challenge, höchstens 10 000.

**Quellen**: Lernlandkarte https://lernapps.net/apps/map/informatik.json (geöffnet 2026-11-26); Blockly 13.4.0 (Apache 2.0, npm); Blockly Games nur als Vorbild (Labyrinth, Turtle), keine Dateien übernommen. Ungeprüft: Tastatur beim Verschachteln und beim Ändern von Feldwerten (Checkpoint 3, Prüfer).



**Prüfung als Lernende 7-8 (Muster), behoben**: Einführung „So funktioniert die Werkstatt“ und Erklärung der Blöcke je Aufgabe; „Testfall“ erklärt, bei nur einem Testfall nicht mehr genannt; Rückmeldung zur Wand nennt das Feld, auf dem Kiko steht, und dass vor ihm eine Wand ist; Richtungspfeil gelb und vor der Antenne; Koordinaten en als (4, 2); lose Blöcke werden blass; leere Frage in „solange“ wird gemeldet statt endlos zu laufen; Versuche zählen erst mit einem Ergebnis; ein Fehlschlag in einem anderen Testfall zeigt diesen Testfall mit dem Endstand; Schrittlimit Labyrinth 3 auf 400; Labyrinth 3 mit Startvorgabe „solange nicht am Ziel?“; Kategorien bei mehr als 6 Blöcken; Tempo mit „langsam/schnell“; Link zur nächsten Aufgabe; Rückweg auch oben; Ergebniszeile mit Titel und Zweck; `back.url` je Sprache möglich; Blockly-Texte für Screenreader ergänzt; „stair“ statt „step“ (en).
**Nicht behoben, an den Orchestrator**: Sprachumschalter und Routen-Links der Runtime verlieren `?c=` bzw. markieren die erste Route als aktuell (bis #201/#202); Titel bricht auf 360 px als „Programmierwerkstat t“ (h1 der Runtime ohne Silbentrennung); geöffnete Kategorie verdeckt auf 360 px den Block „Programm“ (Blockly); Programm geht beim Wechsel von Aufgabe oder Sprache verloren (Speicher folgt in der Aufgabe „Fortschritt im Speicher“).

**arc42 angenommen (ARC42_CONSISTENT, Basis 43adb52)**: Nach `lernapps update` auf app-templates 0.21.0 meldet `arc42 diff --staged` geänderte Prosa bzw. Blöcke in `if-pages`, `term-core` und `term-playthrough`. Sie liegen im allgemeinen Teil außerhalb der App-Abschnitte und kommen unverändert aus der Vorlage (Parameter der Adresse); die App ändert dort nichts.

## Explore

<!--
- Find out what the app teaches, for whom, how much and how it looks. Ask; write no code, run no `create`.
- An answer counts only in the creator's words under "Answers". At most 2 questions per message, one topic each.
-->

### Tasks

- [x] Check the start: the folder `.agents/skills/lernapps-app` exists (else stop and tell the creator that the folder
      was not started with `init`), and `git branch --show-current` prints `work` (else `git switch -c work`).
- [x] Load skill `lernapps-app`. Tell the creator in two sentences what a lernapps app is and where it will live: at
      their own address, free and public, and once listed as a copy on lernapps.net. Say that the technical part
      (GitHub) comes at the end and that you do it.
- [x] Interview: ask the topics "Goal" and "Learners" of "Answers".
- [x] Load skill `lernapps-map-assignment` and read the learning map of the subject as it says. The creator brings
      the content themselves (material, a word list, the pages): note under "Notes" which competencies of the map it
      covers. Else write the skill's assignment, with its story; the creator's yes answers the topics Content and
      Amount. A subject without a map: skip this task and say so.
- [x] Load skill `lernapps-exercise-patterns` and read its reference for the subject. Note under "Notes" how learners
      will practise what the goal names.
- [x] Choose the archetype as skill `lernapps-app` says: read the README of each archetype in question, then tell the
      creator in plain words what the chosen one can and cannot do. Write the archetype and its reason under "Key
      decisions".
- [x] Run `npx --no -- lernapps skills --archetype <name>` with the chosen archetype. It installs the archetype's
      skills and adds the archetype's tasks to this plan.
- [x] Load skill `lernapps-interactive-design`.
- [x] Interview: ask every other topic of "Answers", in order. Leave out only a topic that an answer of the creator
      already covers, and note which answer. A topic nobody answered is asked once before you write an assumption
      with "(guess)".
- [x] Load skill `lernapps-content-research` and research as it says. Write under "Notes": the strand or subject, the
      competencies by chapter with their ids, the sources you opened.
- [x] Write under "Notes", one line per competency: how learners get there (they derive it, they do not only read it
      off), and which misconception the feedback catches.
- [x] Write under "Notes" the scope: what is in, what is out and why, the data range (for example "all main-group
      elements", never a silent "1–20"), the languages.
- [x] **Checkpoint:** research. Show in plain words: the strand or why none, the competencies by chapter, the didactic
      approach, the scope, every "(guess)", the sources and what is unchecked, the archetype and its reason. Stop and
      wait. Changes: change them, then ask again.
      Creator: Ja, so bauen. Explore und Plan darfst du mit diesem Ja zusammen abhaken. (Orchestrator, Checkpoint 2)

### Answers


- Goal: „Eine eigene App, in der Lernende mit Blöcken programmieren. Andere Apps … schicken ihr Challenges … Die Werkstatt führt das Programm aus, prüft es und schickt das Kind zurück.“ (Auftrag #869)
- Learners: Informatik, „als Lernende 7-8 geprüft“; später 9-10 für Ansichten (#495). Vorwissen: keins zum Programmieren. (Auftrag #869, Session-Regeln)
- Model and focus: „Blockly Games … nur als Vorbild“. Wichtig: Challenges von anderen Apps, Prüfung gegen alle Testfälle. (#869)
- Hurdles: „Rückmeldung sagt, warum: Ein Fehlschlag nennt den Testfall und was passiert ist („Der Roboter stößt in Feld 3 an die Wand“).“ (Regeln #509)
- Content: Welten und eingebaute Challenges schreibe ich; Challenges kommen sonst von den Consumer-Apps. (#869)
- Amount: „Labyrinth und Turtle haben je mindestens drei eingebaute Challenges, mit Playthroughs.“ Später Feld und Ansichten. (#869)
- Languages: „Die Werkstatt hat zwei Sprachen, Deutsch und Englisch.“ (Nachtrag 1)
- Look and feel: nicht vorgegeben; (guess) ruhig, aber wie ein Spielfeld: kräftige Farben für Welt und Roboter, keine Effekte. Der Roboter ist ein wiederkehrendes Bild des Epics; Name und Aussehen lege ich beim Muster fest.
- Terms: Werkstatt, Welt, Challenge (für Lernende: „Aufgabe“), Testfall, Block; Schlüsselwörter `wiederhole … mal`, `solange … tue`, `wenn … dann … sonst` / `repeat … times`, `while … do`, `if … then … else`. (Regeln #509, Nachtrag 1)
- Finding the app: Katalogeintrag ist nicht meine Aufgabe (Auftrag). (guess) „Programmieren mit Blöcken, Klasse 7, Schleifen, Roboter, Labyrinth“.

## Plan

<!--
- Map the confirmed content onto the archetype. No new content questions: a gap in the content goes back to Explore.
- The creator confirms the plan in one read. After the yes you work on your own.
-->

### Tasks

- [x] Map the content as "Map the content" of skill `lernapps-interactive-design` says, and write the result under
      "Content method".
- [x] Choose a pattern per competency as skill `lernapps-exercise-patterns` says, and add it to "Content method".
- [x] Add to "Content method" one line per part, as "Parts" of skill `lernapps-interactive-design` says: core, user
      interface, data, playthroughs, routes.
- [x] Add the tasks of Code, each one a piece of work that ends in a commit. First the pattern: one complete page or
      screen, `npx --no -- lernapps plan add --at pattern "<task>"`. Then the others, one call each:
      `npx --no -- lernapps plan add --at pages "<task>"`. Each task says what it builds and what it shows.
- [x] Draw a sketch of each screen, component or interactive exercise: a static SVG or image, or the steps with what
      learners see after each. Keep the files in `.vibe/sketches/`.
- [x] Show the creator, short: goal, competencies by chapter, the Code tasks, the sketches, and the content method in
      plain words (what learners see and do, what the app cannot do). At most 2 questions.
- [x] **Checkpoint:** confirm the plan and the content method. Stop and wait for an explicit yes. Changes: change
      them, then ask again.
      Creator: Ja, so bauen. Explore und Plan darfst du mit diesem Ja zusammen abhaken. (Orchestrator, Checkpoint 2)

### Content method

**Muster je Kompetenz**: eine Challenge = Welt + Aufgabe + Toolbox + Grenzen + mehrere Testfälle + Prüfungen. Die Kompetenz steckt in Toolbox, Grenze und Testfällen (z. B. Zählschleife: höchstens 3 Blöcke; bedingte Wiederholung: Gänge verschiedener Länge). Rückmeldung nennt Testfall, Feld bzw. Stelle und was passiert ist.

**Teile (core, ui, data, playthroughs, routes)**

- **Core `src/core/`** (rein, JSON-Zustand):
  - `ir.ts` – Programm-IR v1. `Program = { main: Stmt[], procs?: Proc[] }`. `Stmt`: `cmd {name, args: Expr[]}`, `repeat {times: Expr, body}`, `while {cond: Expr, body}`, `if {cond, then, else?}`, `set {var, value}`, `call {name, args}`. `Expr`: `num`, `var`, `sense {name, args}`, `not`, `and`/`or`, `cmp {op, a, b}`, `arith {op, a, b}`. Stufe 1 bietet Blöcke für cmd, repeat, while, if, sense, not, Zahl; Variable, Unterprogramm und Parameter kann das IR, die Blöcke kommen mit #495. Daraus entstehen später Struktogramm, Pseudocode und Text.
  - `interpreter.ts` – Stapelmaschine über dem IR: `begin(program, world, config) → Run`, `advance(run) → Run` bis zum nächsten Weltbefehl. Jeder Steuerschritt zählt zum Schrittlimit (Endlosschleife ohne Befehl stoppt auch). Ergebnis: `running | done | crashed(reason) | limit | error(reason)`. `runAll(program, challenge)` spielt alle Testfälle ohne Bild (für Prüfung, Prüfskript, Playthroughs).
  - `worlds/types.ts` – Schnittstelle der Welt (rein, ohne Vue):
    ```ts
    interface World<C, S> {
      id: string; version: number;              // Challenge nennt { type, version }; ältere Versionen bleiben ausführbar
      validateConfig(c: unknown): Problem[];    // eigener Validator, entspricht configSchema
      configSchema: object;                     // für das veröffentlichte Schema
      commands: Record<string, { args: ArgKind[] }>; sensors: Record<string, { args: ArgKind[]; type: "bool" | "number" }>;
      start(config: C): S;
      command(state: S, name: string, args: number[]): S | Failure;   // Failure = { reason: MessageKey, params }
      sense(state: S, name: string, args: number[]): boolean | number;
      checks: Record<string, (state: S, config: C) => Verdict>;       // "ziel-erreicht", "bild-gleich"
      describe(state: S): Message;              // Text ohne Bild, für Screenreader
    }
    ```
    Dazu je Welt in `src/ui/worlds/<id>/`: `View.vue` (SVG) und `blocks.ts` (Blockly-Definitionen, Texte aus den Message-Dateien de/en). Registry `src/core/worlds/index.ts` und `src/ui/worlds/index.ts`.
  - `worlds/labyrinth.ts` v1 – Config `{ map: string[], facing }` (`#` Wand, `.` Weg, `S` Start, `Z` Ziel). Befehle `vorwaerts`, `links`, `rechts`; Sensoren `wand-voraus`, `wand-links`, `wand-rechts`, `am-ziel`. Prüfung `ziel-erreicht`. Fehler „stößt in Feld (x|y) an die Wand“.
  - `worlds/turtle.ts` v1 – Config `{ start?: {x,y,winkel}, ziel: Program }` (das Zielbild als kleines Programm, ohne Steuerblöcke des Lernenden nicht lösbar, weil Grenzen gelten). Befehle `vorwaerts(n)`, `drehe-links(g)`, `drehe-rechts(g)`, `stift-hoch`, `stift-runter`, `farbe(i)`. Prüfung `bild-gleich` mit Toleranz (Hausdorff-Abstand der abgetasteten Strecken ≤ 2). Fehler „Dein Bild weicht bei (x|y) ab“.
  - `challenge.ts` – Validator für `challenge.v1` (eigener Code, kein Ajv), Laden aus `?c=` (base64url, deflate-raw), Testfälle = `world.config` überlagert mit `tests[i].config` (flach). Werkstatt-Prüfungen `hoechstens-bloecke`, `benutzt-block`.
  - `index.ts` – `start(seed, route)`, `step`, `tick`. Aktionen: `challenge` (Weg A), `programm` (IR + Blockzahl + benutzte Blöcke), `start`, `schritt`, `stopp`, `zuruecksetzen`, `tempo`, `testfall` (zeigt einen Testfall), `hinweis`. `tick`: ein Befehl alle `tempo` Ticks. Zustand: Challenge, Programm, aktueller Lauf (Weltzustand, Stapel, Schritte), Ergebnis je Testfall, Versuche, gezeigte Hinweise.
- **UI `src/ui/`**: `App.vue` (Kopf mit Titel und Aufgabe, Welt, Steuerknöpfe, Rückmeldung, Hinweise, Zurück und Ergebniszeile); `Editor.vue` (Blockly, per `defineAsyncComponent` nachgeladen, Ladezustand „Die Blöcke werden geladen …“; Generator Blöcke → IR; Kategorien bei < 600 px Breite); `Authoring.vue` (Route `autoren`); `worlds/*`. Ansagen mit `announce` (Ergebnis, Testfall). Reduzierte Bewegung: kein Gleiten der Figur.
- **Data `src/data/challenges/*.json`** – die eingebauten Challenges (Weg B), je eine Datei nach `challenge.v1`, und `solutions/*.json` (IR der Musterlösung, nur für Playthroughs und Tests).
- **Schema `public/schemas/challenge.v1.schema.json`** – veröffentlicht unter `…/coding/schemas/challenge.v1.schema.json`; Welt-Configs als `$defs` je Welt und Version. Enthält die Regel „Ein englischer Explainer verlinkt `/en/app/`“.
- **Prüfskript `public/tools/challenge-check.v1.mjs`** – mit Vite als eine Datei aus Kern und Welten gebaut, ohne Abhängigkeiten: `node challenge-check.mjs <challenge.json> <loesung.json>` prüft Schema, Welt-Version, Länge des Links und ob die Lösung alle Tests besteht; gibt den Link aus. Startseite und Autorenseite sagen, wie man es aufruft.
- **Playthroughs**: je eingebauter Challenge die Musterlösung (gelöst, Ansage) und ein typischer Fehler (Rückmeldung mit Testfall); Weg A mit gültiger und ungültiger Challenge; Schrittlimit bei Endlosschleife; unbekannte Welt / zu hohe Version; Einzelschritt und Stopp.
- **Routen** (`app.yaml`): `labyrinth-1` „Geradeaus“ (Sequenz), `labyrinth-2` „Der lange Gang“ (Zählschleife, 2 Testfälle), `labyrinth-3` „Immer an der Wand lang“ (solange + wenn, 3 Testfälle); `turtle-1` „Ein Quadrat“ (Sequenz), `turtle-2` „Quadrat mit Schleife“ (höchstens 4 Blöcke), `turtle-3` „Spirograph“ (verschachtelte Schleifen); `autoren` „Eigene Aufgabe bauen“. Mit `?c=` gilt die Challenge aus der Adresse, nicht die Route.
- **Seiten**: Startseite (statisch: was, für wen, so geht's, Links zu den Challenges, Abschnitt „Für Autorinnen und Autoren“ mit Schema und Prüfskript); App-Seite (Challenge); App-Seite Route `autoren` (JSON einfügen, Fehler je Feld, „Ausprobieren“, „Link kopieren“, Beispiel-Challenge zum Laden); Fehlerzustand (Challenge nicht lesbar, unbekannte Welt) mit Link zur Sammlung.
- **Zurück**: Knopf „Zurück zur Erklärung“ öffnet `https://lernapps.net<back.url>#werkstatt=<id>:<geloest|offen>`; Ergebniszeile zum Kopieren („Challenge labyrinth-schleife-1: gelöst im 2. Versuch“).
- **Speicher** (`createStorage`, `lernapps:coding:`): gelöste Challenge-ids und das letzte Programm je id (IR), höchstens 50 Programme, älteste fliegen raus.
- **Größe**: Startseite ohne Skript; App-Seite erst Vue + Kern (~35 kB gzip, geschätzt), Blockly nachgeladen (~190 kB gzip). Messe und nenne beide im Muster.
- **Neue Welt (später, z. B. Feld)**: Kern-Modul + `View.vue` + `blocks.ts` + `$defs` im Schema + 3 Challenges mit Playthroughs, ein PR. Neue Challenge: eine JSON-Datei + Lösung + Playthrough + Route.
- **Lizenzen**: `NOTICE` mit Blockly (Apache 2.0) und den mitgelieferten Blockly-Medien; Ideen aus Blockly Games (Apache 2.0) genannt; App-Code MIT, Inhalte CC BY 4.0.
- **Kann nicht**: kein Rückkanal an den Explainer; kein Text-Programmieren in Stufe 1; Blockly-ARIA teils nur englisch, wo `Blockly.Msg` es nicht übersetzt (Liste im Muster).


## Code

<!--
- Build the app, locally on `work`, on your own. After each task: `plan done`, then one commit with the work and this
  plan. The hooks check each commit; a failing check is fixed from its message, as skill `lernapps-cli` says.
- What you cannot decide: choose, write it under "Key decisions" with "(guess)", go on.
- The creator asks for a change: say your reading in one sentence first, then change every place it holds for
  (`feedback-applied-everywhere`).
-->

### Tasks

- [x] Load skill `lernapps-cli`. Create the app as its section "Create" says:
      `npx --no -- lernapps create --archetype interactive`.
- [x] Fill the content guide `.agents/skills/app-content/SKILL.md` from "Notes" and "Content method": every heading,
      no "FILL IN" left. Commit it before any content.
- [x] Load skill `lernapps-interactive`.
- [x] Muster: Kern (IR, Interpreter, Welt-Schnittstelle, Challenge-Validator, Weg A) und Welt Labyrinth mit labyrinth-1..3, Lösungen und Playthroughs; App-Seite mit Editor (nachgeladen), Welt, Steuerung, Rückmeldung je Testfall, Hinweise, Zurück; de und en; Roboter festlegen. Zeigt: eine Challenge lösen, mit Maus und Tastatur, 360 px hoch und quer
<!-- tasks: pattern (1 added): the one page or screen that is the pattern for the others -->
- [x] **Checkpoint:** the pattern page. Load skill `lernapps-learner-check` and do its learner check on the page. Fix
      what it finds. Then show the creator the page and ask whether the others may follow it. Stop and wait. A
      change: change the pattern first.
      Creator: Ja, Turtle und die übrigen Teile folgen diesem Muster. (Orchestrator, Checkpoint 3)
- [x] Welt Turtle mit turtle-1..3 (Prüfung bild-gleich), Lösungen und Playthroughs. Zeigt: Spirograph zeichnen
- [x] Schema challenge.v1 veröffentlichen (public/schemas) und Test, der Schema und Validator gleich hält. Zeigt: Schema unter coding/schemas/
- [x] Autorenseite (Route autoren): JSON einfügen, prüfen, ausprobieren, Link kopieren. Zeigt: eine eigene Challenge als Link
- [x] Prüfskript public/tools/challenge-check.mjs (Schema, Welt-Version, Länge, Lösung besteht alle Tests). Zeigt: Ausgabe für eine gute und eine kaputte Challenge
- [x] Fortschritt im Speicher (gelöst, letztes Programm), Querformat nebeneinander und Hinweis zum Drehen, Startseite mit Abschnitt für Autoren, NOTICE mit Lizenzen. Zeigt: Neuladen behält das Programm
<!-- tasks: pages (5 added): the other pages or screens, after the pattern -->
- [x] Update the content guide so that it describes the app as built (`app-content-matches`).
- [x] Run `npx --no -- lernapps check` until it passes.
- [ ] Look at every screen and state, at 360 px and on a desktop, as "Look at the app" of skill `lernapps-cli` says.
      Compare each with its sketch.
- [ ] Do the whole-app check of skill `lernapps-learner-check`. Fix what it finds and write under "Notes" what you
      fixed.

## Commit

<!--
- Put the app on GitHub, publish it with the creator's yes, then list it. A push to `main` publishes.
- Open the pull requests (to `main`, to the catalog) without asking: they publish nothing.
- The creator asked to stop before publishing (a trial): stop here and say so.
-->

### Tasks

- [ ] Load skill `lernapps-github`. Set up the repository and Pages as it says. Ask for the repository's name and
      every click only the creator can make, in one message.
- [ ] Push `work`, open the preview pull request and see its checks to green, as skill `lernapps-github` says.
- [ ] **Checkpoint:** publish. Show what the app does and the preview link from the comment "Vorschau der App". Ask
      whether it may go online. Stop and wait for the yes.
- [ ] Load skill `lernapps-commit`. Publish as skill `lernapps-github` says: `work` into `main` as one squash commit,
      the run of `Pages` watched to its end.
- [ ] Open the address the job `deploy` printed and confirm that the app shows. Never use a derived address.
- [ ] Load skill `lernapps-listing`. Write the entry under "Entry draft" as it says, with the creator's answer to
      "Finding the app".
- [ ] Fill the retrospective.
- [ ] Commit this plan on `main` and push it: the listing check and the review read it there.
- [ ] **Checkpoint:** list. Open the listing pull request as skill `lernapps-listing` says, without asking first: the
      pull request is the review. See it to "bestanden", then show the creator the pull request and its result.
- [ ] If the plan changed since its last push, commit it on `main` and push again.

### Entry draft

<!-- YAML valid against the entry schema the listing skill names. Only known values, never invented. -->

```yaml
```

## Retrospective

<!-- At the end of Commit, before the listing pull request. Facts, short, no names. Read by review and evals. -->

### Phases reached

<!-- Last phase completed, checkpoints passed. E.g. "commit; confirmed, published". -->

### Creator turns after the plan

<!-- Number of creator messages after the confirmation, topic of each. Target: at most 3. -->

### Where I had to guess

<!-- Each gap in plan, skills, messages or answers, and your choice. "None" if none. -->
