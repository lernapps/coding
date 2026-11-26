---
name: app-content
description: Use for any content work in this app - researching, writing, extending, correcting or reviewing its competencies, chapters, pages, rounds, questions, exercises, figures, terms or sources. This app's own content decisions; they take precedence over the generic lernapps content skills. Load it before you change any content.
---

# Content guide of this app

Programmierwerkstatt (lernapps/coding): Lernende programmieren mit Blöcken; Challenges kommen eingebaut (Routen) oder
als Link von anderen Apps (`?c=`). Auftrag: lernapps/apps#869, Epic lernapps/apps#509.

## Curriculum

- Lernlandkarte Informatik (https://lernapps.net/apps/map/informatik.json), Strang `algorithmen`, Band 7-8; Ansichten
  für 9-10 folgen mit #495. Kein Lehrplan eines Landes; die Karte gibt die Reihenfolge.

## Competencies

- Kapitel Labyrinth (Routen `labyrinth-1` … `labyrinth-3`, Daten `src/data/challenges/labyrinth-*.json`):
  - `sequenz` – Ich kann Anweisungen in der richtigen Reihenfolge zu einer Sequenz anordnen. → `labyrinth-1`
  - `wiederholung-feste-anzahl` – Ich kann mit einer Wiederholung mit fester Anzahl Anweisungen mehrmals ausführen lassen. → `labyrinth-2`
  - `wiederholung-mit-bedingung`, `verzweigung` – Ich kann mit einer Wiederholung mit Bedingung … / mit einer Verzweigung … → `labyrinth-3`
- Kapitel Turtle (Routen `turtle-1` … `turtle-3`, Daten `src/data/challenges/turtle-*.json`): `sequenz` → `turtle-1`
  (Quadrat, höchstens 8 Blöcke), `wiederholung-feste-anzahl` → `turtle-2` (Quadrat, höchstens 3 Blöcke), `turtle-3`
  (Spirograph, verschachtelte Schleifen, höchstens 7 Blöcke).
- `visuelle-programmierung` – in jeder Challenge.

## Content structure

- Eine Challenge (Schema `public/schemas/challenge.v1.schema.json`): `id`, `title`, `task`, `world {type, version,
  config}`, `toolbox`, `start`, `limits {blocks, steps}`, `tests[]`, `checks[]`, `hints[]`, `view`, `back`.
- Jede eingebaute Challenge hat eine Musterlösung `src/data/solutions/<id>.json` (IR) und mindestens zwei Playthroughs
  `src/playthroughs/<id>-*.yaml`: gelöst, und ein typischer Fehler mit Rückmeldung.
- Eine Challenge mit bedingter Schleife („solange“) hat mindestens drei Testfälle, damit fest codierte Schritte nicht
  bestehen. Zählschleifen erzwingt `limits.blocks` (ein Testfall genügt).
- Welt Turtle: `world.config.ziel` ist das Zielbild als Programm; Prüfung `bild-gleich` (Abstand höchstens 2, Farbe
  zählt nicht); die Rückmeldung nennt die Stelle (x|y), an der das Bild abweicht. Fläche 200 × 200, Start ohne
  Angabe in der Mitte, Blick nach oben.

## Terminology

- Lernende mit „du“ / „you“, einfache Sprache (ISO 24495), Plain English.
- Für Lernende „Aufgabe“ (en „task“), nicht „Challenge“; „Testfall“ (en „test case“); „Block“; „Roboter“.
- Blocktexte Turtle: `gehe … Schritte`, `drehe dich um … Grad nach links/rechts`, `Stift hoch`, `Stift runter`,
  `nimm die Farbe …`; en: `move … steps`, `turn left/right by … degrees`, `pen up`, `pen down`, `use the colour …`.
- Koordinaten: de „Feld (4|2)“ bzw. „(50|100)“, en „square (4, 2)“ bzw. „(50, 100)“.
- Blocktexte: `gehe vorwärts`, `drehe dich nach links`, `drehe dich nach rechts`, `wiederhole … mal`, `solange … tue`, `wenn … dann … sonst`, `Wand voraus?`; en: `move forward`, `turn left`, `turn right`, `repeat … times`, `while … do`, `if … then … else`, `wall ahead?`.
- Felder heißen nach Spalte und Zeile: „Feld (3|2)“, Zählung ab 1 von links oben.
- Himmelsrichtungen nur in Rückmeldungen zur Drehung, sonst „vorne / links / rechts aus Sicht des Roboters“.

## Exercise patterns

- **Challenge-Muster**: Welt + Aufgabe + Toolbox + Grenzen + Testfälle + Prüfungen. Die Kompetenz steckt in Toolbox,
  `limits.blocks` und Testfällen. Beispiel `src/data/challenges/labyrinth-2.json`: höchstens 3 Blöcke, zwei Gänge
  verschiedener Länge.
- Rückmeldung bei Fehlschlag nennt Testfall, Feld und was passiert ist („Testfall 2: Der Roboter stößt in Feld (4|2) an
  die Wand.“). Texte in `src/messages/<lang>.json`, Schlüssel `fail-*`.
- Hinweise (`hints`) gehen vom Allgemeinen zum Konkreten, höchstens drei.

## Figures

- Welten als SVG aus dem Zustand (`src/ui/worlds/<id>/View.vue`); Farben aus CSS-Variablen der App, Kontrast ≥ 3:1
  für Wände und Figur. Jede Welt liefert `describe` als Text für Screenreader.
- Der Roboter (`src/ui/Robot.vue`) ist selbst gezeichnet (SVG), wiederkehrendes Bild des Epics.
- Blockly-Medien aus `public/blockly-media/` (Apache 2.0, NOTICE).

## Sources

- Lernlandkarte Informatik (geöffnet 2026-11-26). Blockly 13.4.0 (Apache 2.0). Blockly Games (Apache 2.0) nur als
  Vorbild für Labyrinth und Turtle, keine Dateien übernommen.

## Adding a chapter or round

- Neue Challenge: `src/data/challenges/<id>.json` nach Schema, `src/data/solutions/<id>.json`, Route in
  `src/app.yaml` (de und en), zwei Playthroughs, `lernapps check`, Commit.
- Neue Welt: Kern `src/core/worlds/<id>.ts` (Schnittstelle `World` in `src/core/worlds/types.ts`), Ansicht und Blöcke
  in `src/ui/worlds/<id>/`, `$defs` im Schema, Eintrag in beiden Registries, drei Challenges, arc42-Block, ein PR.

## Rules learned from mistakes

- Testfälle zählen ab 1; Testfall 1 ist `world.config` selbst, Testfall n ≥ 2 ist `tests[n-2]` (`configAt`). Ein Versatz um eins ließ Testfall 1 die Karte von Testfall 2 zeigen.
- Zahlen in Ansagen formatiert der Translator nach Sprache („1.000“); Playthroughs erwarten die formatierte Zahl.
