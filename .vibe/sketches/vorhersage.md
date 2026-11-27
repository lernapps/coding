# Skizze: Vorhersage

## Labyrinth (vorhersage-1)

```
Was macht Kiko?                                  Rätsel 1 | Rätsel 2
Lies das Programm. Setze die Felder, durch die Kiko geht, der Reihe nach.

   1   2   3   4   5          Deine Vorhersage
 1 ### ### ### ### ###         1. Feld (2|2)
 2 ### K→  [1] [2] ###         2. Feld (3|2)
 3 ### ### ### [3] ###         3. Feld (4|3)  ← zuletzt gesetzt
 4 ### ### ### Z   ###         [Letztes Feld weg] [Alles löschen]

 Markierung: Feld (4|4). Pfeiltasten bewegen, Eingabe setzt, Rücktaste nimmt zurück.

 [Start: vergleichen] [Schritt] [Stopp] [Zurücksetzen]   Tempo ──●──

 ✗ Bis Schritt 2 stimmt deine Vorhersage. In Schritt 3 geht Kiko auf Feld (4|2)… 
```

Rechts: das Programm (Blöcke, nur lesen) und „Das Programm als Text“:

```
wiederhole 2 mal
  gehe vorwärts
drehe dich nach rechts
gehe vorwärts
```

## Turtle (vorhersage-3)

```
Welches Bild malt Kiko?
 (•) Bild A  [Mini-Zeichnung]   ( ) Bild B  [Mini]   ( ) Bild C  [Mini]   ( ) Bild D  [Mini]
     ▸ Beschreibung: Linie 1 von (100|100) nach (100|50) …
 [Start: vergleichen]
 ✗ Bis Linie 2 stimmt dein Bild. Linie 3 zeichnet Kiko von (150|50) nach (150|100), in deinem Bild geht sie nach (100|50).
```
