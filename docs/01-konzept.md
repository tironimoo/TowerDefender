# Konzept

Dieses Dokument beschreibt das Spiel. Zahlenwerte stehen nicht hier, sondern
in `05-startwerte.md`, das direkt aus den Daten erzeugt wird.

## Kurzfassung

Ein Tower-Defense-Spiel für Handy im Klotz-Stil. Zehn handgebaute Karten in drei
Regionen. Der Gegnerweg ist fest, Türme entstehen auf vorgegebenen Bauplätzen
daneben. Vor jeder Karte wählst du vier von zwölf Türmen. Langzeitmotivation
liefern drei ineinandergreifende Systeme: Forschung, Turm-Meisterschaft und
Sterne über drei Schwierigkeitsgrade.

## Getroffene Grundsatzentscheidungen

| Thema | Entscheidung |
|---|---|
| Technik | TypeScript, PixiJS, Capacitor |
| Stil | Klotz-Optik, vorgerenderte Voxel-Sprites |
| Bauen | Fester Weg, freie Bauplätze |
| Progression | Loadout, Forschung, Meisterschaft |
| Ausrichtung | Querformat |
| Ziel | Privates Projekt, Store-Option bleibt offen |

## Grafikstil

Die Bildsprache ist eckig. Würfelförmige Körper, harte Kanten, niedrig
aufgelöste Texturen, steife Animationen mit wenigen Zwischenbildern. Bewusst
kein weicher Look.

Der Anspruch auf hochwertige Grafik wird nicht über mehr Details eingelöst,
sondern über vier Dinge:

1. **Licht.** Jedes Modell wird mit gerichtetem Licht, weichem Umgebungslicht
   und einem echten Schlagschatten vorgerendert. Das erzeugt Plastizität, die
   handgezeichnete Pixelgrafik nur mit viel Aufwand erreicht.
2. **Atmosphäre.** Nebelschichten, Lichtstrahlen, Staubpartikel und ein
   Farbfilter pro Region. Die Karte bekommt Tiefe durch gestaffelte Ebenen.
3. **Rückmeldung.** Jeder Treffer erzeugt einen Aufblitzen des Ziels, einen
   kurzen Rückstoß, Partikel in der Farbe der Schadensart und ein Geräusch.
   Diese Schicht entscheidet mehr über den Qualitätseindruck als die Modelle.
4. **Sauberkeit.** Einheitliche Pixelgröße über alle Objekte, ganzzahlige
   Skalierung, keine Weichzeichnung. Nichts wirkt billiger als gemischte
   Auflösungen.

Jede Region hat ein eigenes Farbklima und eine eigene Palette. Die Paletten
überschneiden sich absichtlich kaum, damit die drei Regionen sich auch auf
einem Vorschaubild sofort unterscheiden.

## Regionen und Level

Zehn Level, aufgeteilt auf drei Regionen. Jedes Level ist eine eigene Karte mit
eigenem Weg und eigener Bauplatz-Anordnung.

### Region 1: Waldsenke, Level 1 bis 4

Grün und goldenes Licht, Laub, Wasserläufe. Über die Wellen hinweg wandert die
Tageszeit Richtung Abend, im Bosslevel ist es Nacht. Die Region führt die
Grundlagen ein.

- Level 1: einfacher Weg, zwei Kurven, Einführung Armbrustturm und Schleuder
- Level 2: Gabelung, der Weg teilt sich und führt wieder zusammen
- Level 3: zwei getrennte Eingänge, ein Ziel
- Level 4: Bosskarte, Waldwächter

### Region 2: Glutschlucht, Level 5 bis 7

Schwarzer Basalt, Lavaadern, Hitzeflimmern, Ascheregen. Hier kommen Flieger und
Feuerwiderstand dazu, das Loadout muss angepasst werden.

- Level 5: schmale Stege über Lava, wenige Bauplätze
- Level 6: erste Flieger, die den Weg ignorieren
- Level 7: Bosskarte, Schmelzherz

### Region 3: Leerlande, Level 8 bis 10

Violett und Tiefschwarz, schwebende Inseln, kein Horizont, langsam treibende
Trümmer. Hier bricht das Spiel seine eigenen Regeln.

- Level 8: Wegstücke erscheinen und verschwinden zyklisch
- Level 9: drei Eingänge, drei Ziele, geteilte Aufmerksamkeit
- Level 10: Bosskarte, Der Verschlinger, drei Phasen

## Gegner

Jeder Gegner hat Lebenspunkte, Tempo, Panzerungstyp und ein Verhalten. Das
Verhalten ist wichtiger als die Werte. Ein Gegner, der nur mehr aushält, ist
kein neuer Gegner.

### Waldsenke

| Name | Rolle | Verhalten |
|---|---|---|
| Moderling | Fleischschild | langsam, viel Leben, keine Besonderheit |
| Krabbler | Schwarm | sehr schnell, wenig Leben, erscheint in Gruppen |
| Knochenschütze | Panzerung | legt Türme in der Nähe regelmäßig für einige Sekunden still |
| Sprengling | Störer | zündet einmal neben einem Turm und legt ihn still |

Die ersten beiden Karten kommen bewusst ohne Panzerung aus. Die Lektion
Panzerung beginnt auf Karte drei, wenn der Spieler die Grundlagen kann.

### Glutschlucht

| Name | Rolle | Verhalten |
|---|---|---|
| Magmakoloss | Tank | zerfällt beim Tod in zwei kleinere Koloss-Splitter |
| Aschefalter | Flieger | folgt nicht dem Weg, fliegt geradlinig zum Ziel |
| Glutgeist | Konter | vollständig immun gegen Feuer, legt Türme in der Nähe still |
| Schildwart | Verstärker | gibt allen Gegnern im Umkreis einen absorbierenden Schild |

### Leerlande

| Name | Rolle | Verhalten |
|---|---|---|
| Schreiter | Durchbrecher | teleportiert sich in Abständen ein Wegstück nach vorn |
| Leerenbrut | Attentäter | unsichtbar; ohne Späherturm nur auf kurze Distanz angreifbar |
| Echo | Heiler | heilt fortlaufend den am stärksten verletzten Gegner in Reichweite |
| Rissgänger | Elite | verdoppelt sein Tempo, sobald es unter halbes Leben fällt |

### Bosse

- **Waldwächter.** Phase eins normal. Unter der Hälfte wurzelt er ein, wird
  kurzzeitig unverwundbar und ruft eine Welle Krabbler.
- **Schmelzherz.** Hinterlässt eine Lavaspur, die Bauplätze blockiert. Bei
  jedem Viertel verlorenem Leben pulst es und schaltet nahe Türme ab.
- **Der Verschlinger.** Drei Phasen mit wechselnder Panzerung. In jeder Phase
  ist genau eine Schadensart wirksam, die anderen prallen ab. Zwingt zu einem
  Loadout, das alle drei Arten abdeckt.

## Schadensarten und Panzerung

Drei Schadensarten: physisch, Feuer, arkan. Drei Panzerungen: Leder, Eisen,
Obsidian, dazu der Sonderfall ätherisch.

| Panzerung | physisch | Feuer | arkan |
|---|---|---|---|
| Leder | 100 % | 100 % | 100 % |
| Eisen | 40 % | 100 % | 110 % |
| Obsidian | 90 % | 20 % | 110 % |
| ätherisch | 0 % | 0 % | 100 % |

Kontrolleffekte stehen getrennt daneben und sind keine Schadensart: Verlangsamen
durch Frost, Fesseln durch Netz, Rückstoß durch Kolben, Rüstungsbruch durch
Alchemie.

Dazu kommen vollständige Immunitäten, die getrennt von der Panzerung stehen.
Der Glutgeist ist gegen Feuer immun, und kein Durchschlag der Welt ändert das.

Damit bekommt die Loadout-Wahl vor dem Level Gewicht. Ein Aufbau ohne arkane
Quelle scheitert an den ätherischen Gegnern in Region drei, unabhängig von der
Schadenshöhe. Weil das eine harte Lektion ist, richtet der Frostturm als
einziger von Beginn an verfügbarer Turm ebenfalls arkanen Schaden an, wenn auch
wenig. Wer die Blitzspule erforscht hat, tut sich deutlich leichter.

## Türme

Zwölf Türme in vier Rollen. Vier davon sind von Anfang an verfügbar, die
übrigen acht schaltet die Forschung frei.

### Direktschaden

| Turm | Schadensart | Besonderheit |
|---|---|---|
| Armbrustturm | physisch | Grundturm, trifft Luft, hohe Feuerrate |
| Balliste | physisch | sehr große Reichweite, durchschlägt Panzerung, langsam |
| Blitzspule | arkan | springt auf bis zu vier Ziele, ideal gegen Schwärme |

### Fläche

| Turm | Schadensart | Besonderheit |
|---|---|---|
| Schleuder | physisch | Bogenschuss mit Flächenschaden, trifft keine Luft |
| Glutdüse | Feuer | Kegel vor sich, setzt in Brand, Schaden über Zeit |
| Ambossfalle | physisch | wird auf den Weg gesetzt, einmalig hoher Schaden, lädt nach |

### Kontrolle

| Turm | Effekt | Besonderheit |
|---|---|---|
| Frostturm | Verlangsamen | Fläche, stapelt bis zu einer Höchstgrenze |
| Netzwerfer | Fesseln | hält ein einzelnes Ziel vollständig fest |
| Kolbenstoß | Rückstoß | schiebt Gegner auf dem Weg zurück |

### Unterstützung

| Turm | Effekt | Besonderheit |
|---|---|---|
| Leuchtfeuer | Verstärkung | erhöht Schaden und Reichweite benachbarter Türme |
| Alchemieturm | Schwächung | bricht Panzerung und erhöht erlittenen Schaden |
| Späherturm | Aufdeckung | macht Unsichtbare sichtbar, erhöht Reichweite im Umkreis |

Nicht jeder Turm trifft Luftziele. Armbrustturm, Balliste, Blitzspule,
Frostturm und Netzwerfer können es, der Rest nicht. Das ist der Grund, warum
das Loadout ab Region zwei überdacht werden muss.

Vier Türme stehen von Beginn an bereit: Armbrustturm, Schleuder, Frostturm und
Glutdüse. Die übrigen acht kommen aus der Forschung.

Unsichtbare Gegner sind ohne Späherturm nicht unangreifbar, sondern nur auf
knapp der halben Reichweite sichtbar. Eine harte Sperre hätte ganze Karten
unspielbar gemacht statt anspruchsvoll. So bleibt der Späherturm sehr wertvoll,
ohne einen Loadout-Platz zu erzwingen.

## Zielauswahl

Jeder Turm hat eine einstellbare Zielpriorität: Erster, Letzter, Stärkster,
Schwächster, Nächster. Die Einstellung ist ein Antippen im Turmmenü. Das ist
billig zu bauen und gibt erfahrenen Spielern viel Kontrolle, ohne Anfänger zu
überfordern.

## Ablauf eines Levels

1. Vorbereitung: Loadout aus vier Türmen wählen, die Gegner der Karte samt
   ihrer Panzerung und Besonderheiten ansehen. Ein fünfter Platz lässt sich
   erforschen.
2. Bauphase: Startgold platzieren, keine Zeitbegrenzung vor der ersten Welle.
3. Wellen: zwischen den Wellen läuft ein Zähler, vorzeitiges Starten gibt
   Bonusgold. Das belohnt Können, ohne Anfänger zu bestrafen.
4. Ausbau: jeder Turm hat drei Ausbaustufen. Jede Stufe verändert auch die
   Silhouette deutlich, damit man einer vollen Karte auf einen Blick ansieht,
   wo noch Ausbau fehlt.
5. Spezialfähigkeiten: erst nach dem letzten Ausbau. Jeder Turm hat zwei, jede
   lässt sich zweimal steigern. Sie sind teuer und machen aus einem fertigen
   Turm noch einmal ein Ziel für das Gold der späten Wellen. Gelernte Ränge
   erscheinen als kleine Edelsteine über dem Turm.
6. Abschluss: Sternewertung nach verbleibenden Leben.

Leben pro Karte: zwanzig, durch Forschung mehr. Drei Sterne bei vollen Leben,
zwei Sterne ab drei Vierteln, ein Stern bei mindestens einem. Ein
durchgekommener Boss kostet alle Leben auf einmal.

## Bedienung auf dem Handy

- Antippen eines freien Bauplatzes öffnet ein Ringmenü mit den vier Türmen des
  Loadouts. Preis und Reichweitenvorschau erscheinen sofort.
- Antippen eines eigenen Turms öffnet Ausbau, Spezialfähigkeiten, Verkauf und
  Zielpriorität. Das Menü bleibt offen und aktualisiert sich selbst: wer auf
  Gold wartet, muss es nicht schließen und wieder öffnen.
- Die Verkaufstaste steht immer an derselben Stelle und behält ihre Größe. Sonst
  rutscht sie beim letzten Ausbau unter den Finger, der eben noch die
  Ausbautaste getroffen hat.
- Ziehen verschiebt die Karte, Zusammenziehen zweier Finger zoomt.
- Geschwindigkeitsschalter mit einfach, doppelt und dreifach. Wird von erfahrenen
  Spielern ständig benutzt und gehört an eine gut erreichbare Ecke.
- Alle Bedienelemente liegen in den unteren Bildschirmdritteln, erreichbar mit
  den Daumen bei gehaltenem Gerät im Querformat.
- Solange der Finger auf einem Turm im Baumenü liegt, zeigt ein Ring seine
  Reichweite. Ohne diese Vorschau baut man auf gut Glück.
- Der Weg trägt Richtungspfeile, der Eingang eine rote und das Ziel eine blaue
  Markierung. Auf einer neuen Karte sieht man den Verlauf damit sofort.

## Was das Spiel nicht tut

- Keine Wartezeiten, keine Energie, keine Zufallskisten.
- Kein Gegner, dessen einzige Eigenschaft eine größere Zahl ist.
- Keine Verbesserung, die alles pauschal stärker macht, ohne etwas zu ändern.
- Keine Werbung, keine Käufe.
