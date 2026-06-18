# 🥚 Eier-Fang im Bundestag

Ein kleines Browser-Game: Von oben fallen Eier herunter – fang sie mit dem Kopf
(der Plattform) auf.

## Spielregeln
- **Gefangenes Ei** = 1 Punkt
- **Verpasstes Ei** = 1 Strike
- Nach **3 Strikes** ist das Spiel vorbei
- Je höher die Punktzahl, desto schneller fallen die Eier – und **Musik & Color-Grading**
  (Himmelsstimmung, Sättigung, Tonart/Tempo) ziehen progressiv mit.

## Steuerung
- **← →** (oder **A / D**) Tasten
- **Finger** wischen (mobil)

Maussteuerung gibt es bewusst nicht: Tastatur und Touch bewegen den Kopf mit
einer festen Geschwindigkeit – das ist die Grundlage der Fairplay-Garantie.

## Fairplay-Garantie
Jedes Ei wird beim Erscheinen so platziert, dass es vom Kopf **noch erreichbar**
ist – berechnet aus der festen Kopfgeschwindigkeit und der **individuellen
Fallzeit** des Eis (Eier fallen unterschiedlich schnell). Mit steigendem Level
wird die Platzierung enger ans physikalische Limit gelegt (über `tightness`),
bleibt aber per Konstruktion immer fangbar. Eine Simulation eines „perfekten
Spielers" bestätigt: 0 Strikes über zehntausende Eier und Bildschirmgrößen von
360 px bis 2560 px.

## Starten
Reines statisches Frontend – keine Build-Schritte nötig.

```bash
cd game
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

(Direkt per Doppelklick auf `index.html` geht auch; ein lokaler Server ist nur
nötig, falls der Browser das Laden von `assets/head.png` über `file://` blockt.)

## Technik
- Reines HTML/CSS/Canvas + Vanilla JS, keine Abhängigkeiten.
- **Hintergrund** (Reichstag/Bundestag) wird simpel & prozedural auf dem Canvas
  gezeichnet (`drawBundestag()` in `game.js`).
- **Musik** wird prozedural über die Web Audio API erzeugt und passt Tempo,
  Tonleiter und Intensität ans Level an (`Audio`-Modul in `game.js`).
- **Plattform-Kopf**: `assets/head.png`. Fehlt die Datei, zeichnet das Spiel einen
  einfachen Platzhalter-Kopf. Siehe `assets/README.md`.
