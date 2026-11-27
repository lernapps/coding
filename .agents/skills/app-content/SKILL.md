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

- Reihenfolge der Routen (`src/app.yaml`, `src/data/index.ts`): labyrinth-1, turtle-1 (Sequenz) → labyrinth-2, turtle-2,
  turtle-3 (Zählschleife) → labyrinth-3 (bedingte Wiederholung allein) → labyrinth-4 (einfache Verzweigung) →
  labyrinth-5 (beides zusammen) → vorhersage-1 … (Programme lesen und voraussagen).
- Kapitel Labyrinth (Routen `labyrinth-1` … `labyrinth-5`, Daten `src/data/challenges/labyrinth-*.json`):
  - `sequenz` – Ich kann Anweisungen in der richtigen Reihenfolge zu einer Sequenz anordnen. → `labyrinth-1`
  - `wiederholung-feste-anzahl` – Ich kann mit einer Wiederholung mit fester Anzahl Anweisungen mehrmals ausführen lassen. → `labyrinth-2`
  - `wiederholung-mit-bedingung` – Ich kann mit einer Wiederholung mit Bedingung … → `labyrinth-3` (Gänge mit 3, 5, 8
    Feldern, Pflichtblock `solange`)
  - `verzweigung` – Ich kann mit einer Verzweigung … → `labyrinth-4` (mit und ohne Wand, Pflichtblock `wenn`)
  - beides → `labyrinth-5` (3 Gänge, Startvorgabe „solange nicht am Ziel?“, Pflichtblock `wenn-sonst`)
- Kapitel Turtle (Routen `turtle-1` … `turtle-3`, Daten `src/data/challenges/turtle-*.json`): `sequenz` → `turtle-1`
  (Quadrat, höchstens 8 Blöcke), `wiederholung-feste-anzahl` → `turtle-2` (Quadrat, höchstens 3 Blöcke), `turtle-3`
  (Spirograph, verschachtelte Schleifen, höchstens 7 Blöcke).
- `visuelle-programmierung` – in jeder Challenge.
- Kapitel Vorhersage (Routen `vorhersage-1` …, Daten `src/data/challenges/vorhersage-*.json`): `algorithmus-ausfuehren` –
  „Ich kann einen Algorithmus Schritt für Schritt von Hand ausführen und so sein Ergebnis ermitteln.“ (Karte: Band
  9-10, setzt `wiederholung-mit-bedingung` voraus; die Aufgaben nutzen nur Blöcke der Kapitel davor).
  - `vorhersage-1` – Labyrinth, Zählschleifen und zwei Rechtsdrehungen; der Gang geht weiter als die Zählschleife (Fehler
    „bis zur Wand“), Kiko schaut nach unten, wenn er rechts abbiegt (Fehler „rechts auf der Karte“).
  - `vorhersage-2` – Labyrinth, „solange nicht am Ziel?“ mit „wenn Wand rechts? dann vorwärts sonst rechts, vorwärts“,
    zwei Rätsel: ein Gang um zwei Ecken, und ein Gang mit Abzweig nach rechts (Fehler „geradeaus weiter“).
  - `vorhersage-3` – Turtle, „wiederhole 3 mal: gehe 60, drehe rechts 120“ (Dreieck); falsche Bilder: links statt
    rechts, 90 statt 120 Grad, 60 statt 120 Grad (Außen- mit Innenwinkel verwechselt). Start bei (80|120), damit jedes Bild auf der Fläche bleibt. Im Vorhersage-Turtle zeigt die Fläche kein graues Zielbild (es wäre
    die Antwort); `world.config.ziel` ist dort das Startprogramm.

## Content structure

- Routen (`src/app.yaml`): elf eingebaute Aufgaben (acht zum Bauen, drei Vorhersagen) und `autoren` (Autorenseite: JSON prüfen, ausprobieren, Link
  kopieren). Mit `?c=` in der Adresse zeigt die Werkstatt die Challenge aus dem Link (Weg A); sie gilt für den ganzen
  Besuch, ein Klick auf eine Route der Liste startet einen neuen Besuch ohne `c`.
- „Start“ spielt alle Rätsel nacheinander (animiert) und hält beim ersten, das scheitert; ein Start ist ein Versuch.
- Jede Aufgabenseite: Titel, Aufgabe, Blockzahl, Rätsel als Reiter (erklärt, wenn mehr als eins), „So funktioniert die
  Werkstatt“ (offen bei der ersten Route), „Blöcke in dieser Aufgabe“ (Schlüssel `explain-<block>` in den
  Message-Dateien), Welt, Steuerung, Rückmeldung, Hinweise, Editor, Rückweg und Ergebniszeile.
- Auf dem Gerät (`src/ui/progress.ts`): gelöste Aufgaben und das letzte Programm je Aufgabe (höchstens 50).
- Eine Challenge (Schema `public/schemas/challenge.v1.schema.json`): `id`, `title`, `task`, `world {type, version,
  config}`, `toolbox`, `start`, `limits {blocks, steps}`, `tests[]`, `checks[]`, `hints[]`, `view`, `back`.
- Jede eingebaute Challenge hat eine Musterlösung `src/data/solutions/<id>.json` (IR) und mindestens zwei Playthroughs
  `src/playthroughs/<id>-*.yaml`: gelöst, und ein typischer Fehler mit Rückmeldung.
- Sensor `weg-frei` („Weg frei?“) für Einsteiger statt „nicht Wand voraus?“ (Labyrinth 3).
- Lückenaufgaben: Befehle im Startprogramm mit `"locked": true` sind fest (nicht verschiebbar, nicht löschbar, ihre
  Fragen auch); Lernende füllen nur die Lücken (Labyrinth 5).
- Das Ziel beendet das Programm nicht: Blöcke nach dem Ziel laufen weiter (eine zu große Zahl in „wiederhole“ stößt an
  die Wand). Pflichtblöcke mit `benutzt-block:<block>`, damit das Konzept der Aufgabe nicht umgangen wird.
- Das Schrittlimit (`limits.steps`) zählt Befehle der Welt; Rückmeldung „Nach … Befehlen“.
- Eine Challenge mit bedingter Schleife („solange“) hat mindestens drei Testfälle, damit fest codierte Schritte nicht
  bestehen. Zählschleifen erzwingt `limits.blocks` (ein Testfall genügt).
- Welt Turtle: `world.config.ziel` ist das Zielbild als Programm; Prüfung `bild-gleich` (Abstand höchstens 2, Farbe
  zählt nicht); die Rückmeldung nennt die Stelle (x|y), an der das Bild abweicht. Fläche 200 × 200 Pixel, Start ohne
  Angabe in der Mitte, Blick nach oben. Zielbild nur mit Zahlen im Bereich der Blöcke, höchstens 200 Linien.

- **Vorhersage** (Prüfung `vorhersage`, allein in `checks`): Das Startprogramm ist fest und nur zu lesen (Editor
  `readOnly`, darunter „Das Programm als Text“). Labyrinth: Lernende setzen den Weg Feld für Feld (nur Nachbarfelder
  des letzten, keine Wand; ein Schritt ist ein Feldwechsel, Drehen zählt nicht), per Klick auf die Karte oder mit den
  Knöpfen „nach oben/rechts/unten/links“ (Richtung auf der Karte, nicht Kikos Blick). Turtle: ein Bild unter 3–4;
  die falschen schreibt der Autor in `vorhersage.bilder` (2–3 Programme mit typischen Fehlern), die Reihenfolge kommt
  aus dem Seed. „Start“ ohne Vorhersage zählt keinen Versuch. Die Rückmeldung nennt den ersten Schritt (Labyrinth)
  bzw. die erste Linie (Turtle), an dem Vorhersage und Lauf auseinandergehen (`fail-predict-*`). Das Programm muss in
  jedem Rätsel ohne Fehler bis zum Ende laufen (der Validator prüft es). Modellvorhersage statt Musterlösung:
  `src/data/solutions/<id>.json` ist eine Liste je Rätsel (Labyrinth: Felder als "x,y" ab 0; Turtle: Nummer des Bildes
  bei Seed 1), eingetragen in `PREDICTIONS` von `src/data/index.ts`.
- Vorhersage-Seite (nach dem Lernenden-Check): Hilfe offen, „Blöcke in dieser Aufgabe“ fehlt (die Erklärungen sprechen
  vom Ändern der Zahlen). „Das Programm als Text“ steht über der Karte (bei 360 px direkt über ihr); während eines Laufs
  ist der Block, der dran war, im Editor und in der Textfassung markiert (der Kern nummeriert das Programm, `b1` …).
  Der Knopf heißt „Ein Befehl“ statt „Ein Schritt“, weil „Schritt“ hier ein Feldwechsel ist. Während eines Laufs (auch
  angehalten) lässt sich die Vorhersage nicht ändern. Ein Klick auf ein Feld, das nicht geht, sagt warum. Nach dem Lauf:
  Kikos Weg als orange Linie, das abweichende Feld rot umrandet.

## Terminology

- Lernende mit „du“ / „you“, einfache Sprache (ISO 24495), Plain English.
- Für Lernende „Aufgabe“ (en „task“), nicht „Challenge“; die Testfälle einer Aufgabe heißen „Rätsel“ (en „puzzle“), als Reiter über dem Bild; „Block“; Kiko, ein Roboter.
- Blocktexte Turtle: `gehe … Pixel`, `drehe dich um … Grad nach links/rechts`, `Stift hoch`, `Stift runter`,
  `nimm die Farbe …`; en: `move … pixels`, `turn left/right by … degrees`, `pen up`, `pen down`, `use the colour …`.
- Koordinaten: de „Feld (4|2)“ bzw. „(50|100)“, en „square (4, 2)“ bzw. „(50, 100)“.
- Blocktexte: `gehe vorwärts`, `drehe dich nach links`, `drehe dich nach rechts`, `wiederhole … mal`, `solange … tue`, `wenn … dann … sonst`, `Wand voraus?`; en: `move forward`, `turn left`, `turn right`, `repeat … times`, `while … do`, `if … then … else`, `wall ahead?`.
- Felder heißen nach Spalte und Zeile: „Feld (3|2)“, Zählung ab 1 von links oben.
- Vorhersage: „Deine Vorhersage“ (en „Your prediction“), „Schritt“ = ein neues Feld (en „step“), „Linie“ (en „line“).
- Himmelsrichtungen nur in Rückmeldungen zur Drehung, sonst „vorne / links / rechts aus Sicht des Roboters“.

## Exercise patterns

- **Challenge-Muster**: Welt + Aufgabe + Toolbox + Grenzen + Testfälle + Prüfungen. Die Kompetenz steckt in Toolbox,
  `limits.blocks` und Testfällen. Beispiel `src/data/challenges/labyrinth-2.json`: höchstens 3 Blöcke, zwei Gänge
  verschiedener Länge.
- Rückmeldung bei Fehlschlag nennt Testfall, Feld und was passiert ist („Testfall 2: Der Roboter stößt in Feld (4|2) an
  die Wand.“). Texte in `src/messages/<lang>.json`, Schlüssel `fail-*`.
- Hinweise (`hints`) gehen vom Allgemeinen zum Konkreten, höchstens drei.
- **Vorhersage-Muster**: Programm fest, Lernende sagen den Lauf voraus (siehe Content structure). Die Kompetenz steckt im
  Programm: Zählschleife, die vor der Wand endet; Drehung, nachdem Kiko sich schon gedreht hat; „solange“ und „wenn“,
  deren Ausgang von der Karte abhängt. Beispiel `src/data/challenges/vorhersage-1.json`, Playthroughs
  `vorhersage-1-geloest.yaml` und `vorhersage-1-falsch-abgebogen.yaml`.

## Figures

- Labyrinth: Felder 40 × 40, Spalten- und Zeilennummern am Rand, Wand dunkel, Weg hell, Ziel grün mit Fahne, Spur als
  Punkte. Turtle: Fläche 200 × 200 mit Skala alle 50, Zielbild grau und breit, gezeichnete Linien in vier Farben.
- Kiko steht aufrecht; das gelbe Dreieck am Kreis zeigt die Blickrichtung (Name und Aussehen festgelegt, #495 übernimmt
  sie; nicht ändern). Datei `public/kiko.svg`, Komponente `src/ui/worlds/Robot.vue`.
- Welten als SVG aus dem Zustand (`src/ui/worlds/<id>/View.vue`); Farben aus CSS-Variablen der App, Kontrast ≥ 3:1
  für Wände und Figur. Jede Welt liefert `describe` als Text für Screenreader.
- Der Roboter (`src/ui/Robot.vue`) ist selbst gezeichnet (SVG), wiederkehrendes Bild des Epics.
- Blockly-Medien aus `public/blockly-media/` (Apache 2.0, NOTICE).

- Zum Ausdrucken (`public/karten/<lang>/`): Befehlskarten (2 Seiten) und Spielfeld, A4, schwarz-weiß lesbar, erzeugt
  von `scripts/build-cards.ts` aus den Blocktexten der Message-Dateien und den Blockfarben (`npm run build:cards`;
  ein Test meldet veraltete Karten).

## Sources

- Lernlandkarte Informatik (geöffnet 2026-11-26). Blockly 13.4.0 (Apache 2.0). Blockly Games (Apache 2.0) nur als
  Vorbild für Labyrinth und Turtle, keine Dateien übernommen.

## Adding a chapter or round

- Neue Challenge: `src/data/challenges/<id>.json` nach Schema, `src/data/solutions/<id>.json` (bei einer Vorhersage die
  Modellvorhersage, in `PREDICTIONS`), beide in `src/data/index.ts` eintragen, Route in `src/app.yaml` (de und en), zwei Playthroughs (gelöst, typischer Fehler),
  `lernapps check`, Commit. Neue Blöcke brauchen `block-<id>` und `explain-<id>` in beiden Message-Dateien.
- Neue Welt: Kern `src/core/worlds/<id>.ts` (Schnittstelle `World` in `src/core/worlds/types.ts`), Ansicht und Blöcke
  in `src/ui/worlds/<id>/` (Zahlenfelder der Befehle in `ARGS` von `src/ui/editor/blocks.ts`), `$defs` und
  `world.oneOf` im Schema, Eintrag in beiden Registries, drei Challenges, arc42-Prosa, ein PR. Danach
  `npm run build:check-script` (ein Test meldet ein veraltetes Prüfskript) und eine neue Version der Welt nur als neues
  Modul: alte Versionen bleiben, damit alte Links laufen.

## Rules learned from mistakes

- Der Kern ändert sich → `npm run build:check-script`, sonst schlägt der Test des Prüfskripts fehl (auch bei geänderten
  Message-Dateien).
- Lernende bauen von oben nach unten und legen Blöcke unter das Programm (#495): Der Editor hängt einen Block, der
  unter dem Programm (oder per Tastatur ohne Platz) abgelegt wird, ans Ende; lose Blöcke tragen ein Warnzeichen und
  stehen gezählt unter der Arbeitsfläche. Die Arbeitsfläche fasst mindestens 10 Blöcke.
- Die Zeile für die Lehrkraft nennt den Titel, nicht die interne id.
- Ein Abschnitt der Startseite verlinkt keine Route (`app/#…`): Der Test der Runtime erwartet genau einen Link je Route.

- Testfälle zählen ab 1; Testfall 1 ist `world.config` selbst, Testfall n ≥ 2 ist `tests[n-2]` (`configAt`). Ein Versatz um eins ließ Testfall 1 die Karte von Testfall 2 zeigen.
- Zahlen in Ansagen formatiert der Translator nach Sprache („1.000“); Playthroughs erwarten die formatierte Zahl.
