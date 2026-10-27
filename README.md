# ROCKIN · Saxo

Tutor d'estudi de **saxo** (alt o tenor) amb el full de ruta ROCKIN (10 nivells) i les cartes ROCKIN. El saxo és un membre més de la banda: el joc treballa tant la **melodia de la cançó** (la que el professorat escriu al Generador de diagrames, amb els números de digitació) com el **contorn sobre les notes dels acords** (la fonamental, després la nota més propera…).

Cada pas és

1. **Escolta**: sona la banda i el saxo del joc toca la teva part; el diagrama de claus i la pista ensenyen què es fa.
2. **Ara tu**: la banda continua i toques tu. El diagrama t'ensenya el número d'ara i el que ve.
3. **Com t'ha anat?**: marques el nivell (**En procés**, **A prop** o **Ja ho tens!**), dius què t'ha faltat i tries què vols fer ara.

Amb el **TravelSax** connectat (USB-C o Bluetooth MIDI, Chrome o Edge), el joc sent cada nota: si era la bona, si anava aviat o tard, si era l'altra octava i, al nivell 3, si bufaves fort o fluix (pressió de l'aire, CC2). Al final marca el nivell i l'alumne ho pot canviar.

## Com obrir-lo en local

```
cd ~/Documents/GitHub/saxo
python3 tools/serve.py
```

(Amb doble clic a `index.html` no funciona: el navegador no carrega els mòduls des de `file://`.)

## Els números de digitació

Els del document «Notació Saxo» de ROCKIN: `1` = Si · `2` = La (1+2) · `3` = Sol · `4` = Fa · `5` = Mi · `6` = Re · `2,5` = Do · `0` = Do♯ · `'` = amb la clau d'octava · `+` = clau afegida (`1+` Si♭, `3+` Sol♯, `6+` Mi♭, `6+C` Do♯ greu) · `6C` = Do greu · `4,5` = Fa♯. Els números són sempre de la nota **escrita** per al saxo; el joc fa la transposició (alt en Mi♭, tenor en Si♭) i la banda sona en notes reals.

## Fitxers

| Fitxer | Què fa |
|---|---|
| `js/saxo-core.js` | El mateix `saxo.js` del Generador de diagrames: transposició alt/tenor, nota → número, claus de cada número i el dibuix del diagrama. **No s'edita aquí**: es copia del Generador. |
| `js/instruments.js` | Alt i tenor (colors, rang, zona còmoda) i les funcions nota real ↔ número. |
| `js/levels.js` | **El full de ruta**: nivells i passos. Els passos amb `needsLine` només surten si la cançó porta melodia de saxo del Generador. |
| `js/parts.js` | La part del saxo: fonamentals (`arrels`), nota propera (`propera`), melodia del Generador (`melodia`, amb el seu ritme o el d'una carta), segona veu (`segona`), canvis de digitació (`canvi`), cartes melòdiques (`arp`), composició (`compose`). |
| `js/saxview.js` | L'animació: el diagrama de claus, el número d'ara, «ara ve» i, a la improvisació, les notes que encaixen. |
| `js/midi.js` | El TravelSax per Web MIDI: notes, pressió de l'aire (CC2), calibratge («toca un 1»), el quadre de connexió i un teclat de prova. |
| `js/sjudge.js` | El jutge: compara cada nota rebuda amb la que tocava (temps, nota, octava, dinàmica). |
| `js/session.js` | La pantalla de pràctica, el joc d'afinar (nivell 7), el compositor (nivell 9) i la improvisació (nivell 10). |
| `js/band.js`, `js/player.js`, `js/audio.js` | La banda (bateria, baix, teclat, guitarra) per estils, el rellotge i el so (mostres MIT + saxo sintètic). Compartits amb el joc de guitarra i baix. |
| `js/library.js` | Biblioteca compartida del Generador: acords, estructura i les melodies de saxo (`saxLines`). |
| `js/store.js` | Progrés al navegador (`rockin.saxo.v1`): diversos alumnes al mateix ordinador. |

## Cançons

«Cançó» obre el Llibre ROCKIN, la biblioteca compartida del Generador (amb el codi del professorat: és on arriben les melodies de saxo), un fitxer exportat del Generador (.json), les rodes del joc de teclat i les cançons pròpies. Si la cançó té més d'una melodia de saxo, a la pràctica es pot triar quina.

## Versió 1 · 27-10-2026

Primera versió: full de ruta sencer, melodia del Generador i contorn sobre acords, TravelSax, joc d'afinar d'oïda, composició i improvisació. Pendent: provar-ho amb un TravelSax de veritat (calibratge, retard per Bluetooth, si envia CC2) i amb alumnat.
