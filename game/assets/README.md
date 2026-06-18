# Assets

## head.png (Plattform-Kopf)

Der **freigestellte Kopf** (Kopf + Schultern, transparenter Hintergrund), der im
Spiel als Plattform zum Auffangen der Eier dient.

Erzeugt aus dem Quellfoto mit KI-Hintergrundentfernung (rembg / u2net) und auf die
Bounding-Box der Person zugeschnitten. Die Plattform-Maße in `game.js`
(`HEAD_ASPECT`, `CATCH_FRAC`, `CATCH_HALF_FRAC`) sind auf dieses Bild abgestimmt:
die Fanglinie liegt am Scheitel, die Fangbreite entspricht der echten Kopfbreite.

Zum Austauschen: neues freigestelltes PNG als `head.png` ablegen. Hat es ein anderes
Seitenverhältnis, ggf. `HEAD_ASPECT` in `game.js` anpassen. Fehlt die Datei, rendert
das Spiel automatisch einen einfachen Platzhalter-Kopf.

## Verwandlungs-Stufen nach Score

- **ab 25 – head3.png ("Feucht"-Form):** Bildwechsel + dezenter cyaner Blitz.
- **ab 75 – head2.png (Rage-Form):** Feuer-Aura + "RAAAR"-Schrei.

`head2.png` und `head3.png` sind weitere freigestellte PNGs. Beide werden über
ihren gemessenen Kopf-Kreis (`HEAD2_FX/FY/FR` bzw. `HEAD3_FX/FY/FR` in `game.js`)
exakt auf die Spiel-Hitbox gemappt, sodass der Fang immer auf dem Kopf liegt und
etwaige Effekte drumherum ragen. Fehlt eine Datei, bleibt für diese Stufe der
normale Kopf – Schrei und Buh-Rufe laufen trotzdem.
