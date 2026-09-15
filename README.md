# SIPster 🍻

Ein Hitster-inspiriertes Trinkspiel – aber statt Jahreszahlen einzuordnen,
müsst ihr **Titel und/oder Interpret** erraten. Das richtige **Jahr** gibt
zusätzlich ein Extra-Leben. Die Songs zieht die App selbst per YouTube-Suche,
damit niemand – auch nicht der/die Gastgeber:in – vorher weiß, was kommt.

## Spielregeln

- Jede:r startet mit **4 Leben** (Maximum: 4).
- Titel **oder** Interpret korrekt genannt → kein Leben verloren.
- Weder Titel noch Interpret genannt → **ein Leben weg** (= trinken).
- Zusätzlich das richtige **Jahr** genannt → **Extra-Leben** (Deckel bei 4).
- Wer bei 0 Leben landet, scheidet aus. Das Spiel endet, wenn nur noch
  eine Person übrig ist oder der Songpool leer ist.

## Setup

### 1. YouTube Data API Key besorgen (kostenlos)

1. [Google Cloud Console](https://console.cloud.google.com/) öffnen, neues Projekt anlegen (oder ein bestehendes nutzen).
2. Unter *APIs & Dienste → Bibliothek* nach **"YouTube Data API v3"** suchen und aktivieren.
3. Unter *APIs & Dienste → Anmeldedaten* auf **"Anmeldedaten erstellen" → "API-Schlüssel"** klicken.
4. Den erzeugten Key kopieren.

> Das kostenlose Kontingent (10.000 Einheiten/Tag, eine Songsuche kostet 100)
> reicht für ~100 Songs pro Tag – für einen Spieleabend völlig ausreichend.
> Bereits gesuchte Songs werden im Browser zwischengespeichert, damit sie bei
> einer Wiederholung keine neue Anfrage mehr verbrauchen.

### 2. App starten

Die App ist eine reine Client-Anwendung (HTML/CSS/JS), kein Server nötig.
Am zuverlässigsten läuft sie über einen lokalen Webserver (manche Browser
blockieren sonst Requests von `file://`-Seiten):

```bash
cd SIPster
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

Alternativ könnt ihr den Ordner z. B. auf GitHub Pages, Netlify o. Ä. hosten.

### 3. Im Spiel

1. API-Key im Setup-Bildschirm eintragen und speichern (wird lokal im
   Browser gespeichert, verlässt euer Gerät nicht – außer für die eigentliche
   YouTube-Suche).
2. Mindestens 2 Spieler:innen hinzufügen.
3. "Spiel starten" klicken.
4. Pro Runde: **Song ziehen** → **Abspielen** (Video ist bewusst verdeckt,
   es läuft nur der Ton) → alle raten laut Titel/Interpret/Jahr → per
   Checkbox eintragen, was korrekt genannt wurde → **Auswerten**.
5. Die Auflösung zeigt Titel, Interpret und Jahr – erst danach seht ihr es.

## Warum ein eigener API-Key nötig ist

Damit *auch* die Person, die das Handy/Laptop bedient, nicht vorher sieht,
welcher Song kommt, sucht die App den Song zur Laufzeit live über die
YouTube-Suche (statt einer fest hinterlegten Liste mit Video-Links im Code,
die jede:r im Quelltext nachlesen könnte). Das erfordert zwingend Internet
und einen YouTube-API-Zugang – passt aber gut, da ihr ohnehin online seid,
um die Songs abzuspielen.

## Songpool erweitern

Die Songliste liegt in [`js/songs.js`](js/songs.js) als einfaches Array mit
`title`, `artist` und `year`. Einfach weitere Einträge ergänzen – die Video-ID
wird automatisch zur Laufzeit über die YouTube-Suche ermittelt, ihr müsst also
keine Links heraussuchen.
