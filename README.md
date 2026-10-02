# Bodo & Zakarota — Das Kristallabenteuer (v2)

Ein abhängigkeitfreies, lokal spielbares Arabisch-Abenteuer für Kinder von etwa 6 bis 11 Jahren. Die v2 ersetzt die frühere Editorial-Startseite durch eine illustrierte Dorfkarte mit drei erreichbaren Lernorten: **Hallo**, **Farben** und **Zahlen**. Der Hauptknopf führt mit einem Klick zum nächsten offenen Kapitel.

## Was im Browser spielbar ist

Jede Wortaufgabe führt vom Bild und der Situation zum freiwilligen Vorlesen, dann zu einer großen Bildantwort und unmittelbarem Feedback. Erst nach einer richtigen Bildzuordnung werden arabische Schrift und die davon getrennt ausgezeichnete links-nach-rechts-Umschrift sichtbar. Verfehlte Wörter tauchen am Kapitelende genau einmal in einer kurzen Wiederholungsrunde auf. In „Zahlen“ wird ثَلَاثَة anschließend beim Zählen von drei Äpfeln angewendet.

Auf der Startkarte sind alle drei Begleiter sichtbar: Bodo als rosa Gehirn-Erklärer mit dem Bodo-Schild, Zakarota als die große Figur im blauen Anzug und Lulu als kleiner freundlicher Drache. In den aktiven Lernaufgaben sind Bodo und Lulu mit Namen in der Szenenillustration zu sehen; Bodo und Zakarota bleiben außerdem in der Aufgabenleiste sichtbar. Für die erste Begrüßung passen Text und Illustration nun zum leuchtenden Dorftor. Bodo und Zakarota nutzen das unveränderte lokale Figurenasset; Lulu erscheint mit der vorhandenen Vektorillustration.

## Lokal starten und testen

Im Projektordner:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Danach `http://127.0.0.1:8000/` im Browser öffnen. Die App enthält keine Laufzeitabhängigkeiten, externen Fonts/CDNs oder eigenen Netzwerkaufrufe. Der HTTP-Server wird nur an die lokale Schnittstelle gebunden.

## GitHub Pages

Die Projektseite wird unter <https://revucio24-web.github.io/bodo-zakarota-arabisch-abenteuer/> bereitgestellt. CSS, JavaScript und das Figurenasset werden über relative Pfade eingebunden, damit die App auch unter dem GitHub-Pages-Projektpfad funktioniert.

```sh
node --check game.js
node --test tests/game.test.cjs
```

## Fortschritt, Wiederholung und Audio

`localStorage` verwendet den bestehenden Schlüssel `bodo-zakarota-arabisch-mvp-v1`, damit bereits abgeschlossene Kapitel erhalten bleiben. Neben den abgeschlossenen Kapitel-IDs enthält er ausschließlich höchstens fünf feste, verfehlte Wort-IDs. Korrekt wiederholte IDs werden entfernt. Antworten, Namen, Alter, Audio und Mikrofonresultate werden nicht gespeichert. Die Liste wird weder zur Bewertung noch als Nachweis von Sprachbeherrschung verwendet.

Eine „Für Erwachsene“-Info im Seitenfuß erklärt die Datensparsamkeit und bietet eine zweistufige Löschung des Lernstands im aktuellen Browser. Sprachausgabe und Spracherkennung hängen von Browser, Stimmen, Berechtigungen und Gerät ab. Spracherkennung ist freiwillig, startet erst nach einem Hinweis und einer ausdrücklichen Zustimmung, kann von externen Browserdiensten verarbeitet werden und lässt sich abbrechen. Die App verspricht keine Offline-Nutzung.

## Projektdateien

- `index.html` — lokale App-Hülle, Elterninfo und Fortschrittslöschung
- `styles.css` — responsive Dorfkarte und Lernbühne, Fokus- und reduced-motion-Regeln, arabische RTL-/Umschrift-LTR-Auszeichnung
- `game.js` — Lerninhalte, Hör-/Bild-Loop, Feedback, einmalige Sitzungswiederholung, lokale Review-IDs, optionale Browser-Audiofunktionen
- `media/characters.webp` — unverändertes vorhandenes Figurenasset
- `tests/game.test.cjs` — Regressionstests der Ansichten, Szenenkontinuität, Kontrastwerte, Zustände, Speicherdaten, Löschung, Audio-Fallbacks und Netzwerkgrenzen

## Asset-Hinweis

`media/characters.webp` war bereits in der übernommenen Ausgangsprojektmappe vorhanden und wird byte-identisch weiterverwendet (SHA-256: `88cdb93b53641f56e5b5fc53fe5d571b6a7cc7ee70f7bc5a8d2971085cff295d`). Die auslesbaren Bildmetadaten weisen WEBP, 1254 × 1254 Pixel und RGB aus, enthalten aber keine Urheber-, Quellen- oder Lizenzangaben. In den Projektdateien liegt außerdem keine Git-Historie vor, die den Ursprung belegt. Die weitergehende Herkunft, Urheberschaft, Lizenz und Nutzungsrechte bleiben daher **ungeprüft**; aus dem Vorhandensein in der Ausgangsmappe folgt keine Rechteklärung.

Die externe Vergleichsrecherche dient hier nur als Produktorientierung; sie ist kein Nachweis einer Lernwirkung oder einer geprüften Konkurrenz-Spielsession. Es wurden keine Kinder- oder Nutzertests durchgeführt.
