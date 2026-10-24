# Bezpečný Navigamus – hra místo testu (návrh)

Navigamus 2027, 3.–6. 6. 2027, Hlučínské jezero. Hra nahrazuje povinný test
„Bezpečný Navigamus“ (pravidla akce + Safe from Harm). Výchozí podklad:
`testové otázky Navigamus-draft.docx.md`.

## Cíl

Ne „umíš správně odpovědět“, ale „tohle akce řeší vždycky a ty můžeš pomoct
kritickým myšlením“. Přehnat to na kteroukoli stranu je chyba.

## Hráč

- Hrají všichni (vedoucí, členové oddílů, servis tým od 15 let), jedna hra, jedna role.
- Neutrální „ty na Navigamu“ – situace, které může potkat kdokoli. Děti jsou
  „děti na akci“, ne „tvoje děti“.
- Tykání. Rod: psát tak, aby nebyl potřeba (1. osoba přítomného času ve volbách,
  2. osoba přítomného času v popisech). Kde to nejde, oba tvary celé
  („unavený nebo unavená“), nikdy hvězdička ani lomítko.

## Mechanika (hybrid Reigns + příběh)

- Karta = situace + dvě volby (swipe vlevo/vpravo, nebo tlačítka/klávesy ← →).
  Volby jsou konkrétní akce, ne „ano/ne“. Někdy jsou obě nedokonalé.
- Čtyři skryté ukazatele 0–100, zobrazené jen jako ikony-nádobky bez čísel:
  - 🛡️ Bezpečí – jsou lidé kolem v bezpečí
  - 🤝 Důvěra – svěřují se ti, dá se za tebou přijít
  - 👥 Parta – vztahy s vrstevníky a ostatními dospělými
  - 🔋 Síly – únava, spánek, nervy
- Při tažení karty se nad dotčenými ukazateli ukážou tečky (velikost = síla
  změny), ne směr.
- Pád: ukazatel na 0 nebo na 100.
- Jeden typ karty. Vážná témata = silné dopady, ne zvláštní mechanika.
- Opakující se postavy a navazující karty (příznaky nastavené dřívější volbou).

## Struktura

- 4 dny (čtvrtek → neděle), každý den ráno / odpoledne / večer / noc.
- Průchod ~35–40 karet, ~10 minut.
- Balíček: cíl 100 karet = povinné (každé téma aspoň jednou, pevně v daném dni)
  + náhodné + navazující.
- Na konci každého dne **Lodní deník**: shrnutí rozhodnutí u karet s polem
  `denik` – jedna věta komentáře + odkaz.

## Pečeť (náhrada osvědčení)

- Pečeť dostane hráč, který dojede do neděle a potkal všechny povinné karty.
- Při pádu: obrazovka konce + rozbor (co se stalo, proč, kam se obrátit),
  pak pokračování od začátku téhož dne (checkpoint).
- Pečeť = osobní kód (varianta „na důvěru“). **Otevřené:** jak přesně a jak
  ho ověří registrace.
- Galerie objevených konců motivuje hrát znovu.

## Konce

Pády (0): Ztroskotání (Bezpečí), Zavřené dveře (Důvěra), Osamělý maják (Parta),
Vyhoření (Síly).
Pády (100): Kapitán Bligh (Bezpečí), Nejlepší kámoš (Důvěra), Jeden z party
(Parta), Prospaný Navigamus (Síly).
Dobré: Bezpečný přístav (vše ve středu), Přístav s šrámy (něco na hraně),
volitelně tajný konec.

## Témata

Safe from Harm: alkohol a návykové látky; situace 1:1 s dítětem; hranice a
dotyky; fotky a sítě; šikana; svěření se dítěte; nevhodné chování dospělého;
kam se obrátit; bezpečnost u vody.
Pravidla akce (z testu): noční klid; otevřený oheň; cizí osoba bez šátku/pásku;
kouření nezletilých; péče o sebe a únava; Kodex jednání dospělých.
Podpůrné služby jako opakující se postavy: Jindřich (Uši pro duši), Hanka (SOS),
Martin (SZT), infostan, servis tým.

## Pravidla Navigamu 2027 (pro texty karet)

Zdroj: [Podmínky účasti](https://navigamus.cz/podminky-akce) + upřesnění od sekce.

- Účastníci jsou v **posádkách**, vede je **vedoucí posádky** (ne „oddíl“, „patrola“).
- Platí skautský zákon, Kodex jednání dospělých, zákony ČR, předpisy Junáka,
  pokyny pořadatele. Ohleduplnost i k personálu areálu a veřejnosti.
- **Alkohol: zakázaný všem**, v areálu nikdo pod vlivem alkoholu ani jiných látek.
- **Kouření**: jen na vyhrazených místech a jen kdo smí podle zákona. Nezletilí
  kuřáci: správný postup je řešit přes jejich vedoucího posádky (ne rovnou vyloučení).
- **Noční klid od 22:00.**
- **Oheň povolený pod dozorem.**
- **Šátek a identifikační pásek povinné.**
- **Služby na akci: Uši pro duši, SOS, SZT, infostan** (+ handbook, servis tým).
- **Focení povolené**, ale: zveřejňovat jen se souhlasem (cizí děti ne, svoje
  posádka dle souhlasů rodičů), citlivé situace (plavky, převlékání, sprchy,
  spaní, pláč, zranění) nikdy, a když se někdo ohradí, respektuješ to.
  Cizí dospělý bez šátku a pásku, který fotí děti → SOS.
- Vedoucí posádek a servis od 15 let dokládají dětský certifikát.
- Sankce: vyloučení z akce bez vrácení poplatku.

## Prostředí a tón

Realistický Navigamus (místa, služby, pravidla) s „bountyovským“ kabátem jen
v grafice a názvech. Žádné spoilery celotáborového příběhu. Lehké karty
s humorem, vážné bez vtipů.

## Technika

- Statický web, mobil na prvním místě, bez instalace a přihlášení.
- Čisté HTML + CSS + JS, bez frameworku, bez build kroku, bez externích závislostí.
- Kód (identifikátory, komentáře, JSON klíče) anglicky, texty pro hráče česky.
- Karty v JSON. `kontrola.html` zobrazí karty jako scénář a validuje
  (povinné karty dosažitelné, konce dosažitelné, příznaky navazujících karet existují).
- Postup v `localStorage`.
- Upozornění na obsah na začátku hry.

### Card schema (`data/cards.json`)

Code, JSON keys and comments in English; player-facing texts in Czech.

```json
{
  "id": "confide-promise",
  "day": 3,
  "slot": "evening",
  "required": true,
  "topic": "confiding",
  "character": "Bára (12)",
  "text": "„Můžu ti něco říct? Ale musíš slíbit, že to nikomu neřekneš.“",
  "left":  { "label": "Slibuju, neboj.", "effect": { "trust": 10, "safety": -30 } },
  "right": { "label": "„Neslíbím, ale pomůžu ti. Poslouchám.“", "effect": { "trust": 5, "safety": 10 } },
  "log": "Mlčení neslibuj, pomoc možná budeš muset hledat jinde. Kam: Uši pro duši, SOS."
}
```

- `day`: 1 = čtvrtek … 4 = neděle; `slot`: `morning | afternoon | evening | night`.
- `required`: povinná karta – vždy se zamíchá do svého dne.
- `effect` keys: `safety` 🛡️, `trust` 🤝, `crew` 👥, `energy` 🔋 (−50…+50).
- Optional on a choice: `"set": ["flag"]`, `"logChoice": "…"` (text do deníku pro tuto volbu).
- Optional on a card: `"requires": ["flag"]`, `"excludes": ["flag"]` (navazující karty),
  `"log"` (text do večerního deníku).
- `intended`: `left | right | both | neither` – přiměřená volba; čte jen
  `check.html` (simulace), hra ne. Hra strany náhodně prohazuje.
- `topic` values: `alcohol, one-on-one, boundaries, photos, bullying, confiding,
  adult-misconduct, where-to-turn, water, night-quiet, fire, stranger, smoking,
  self-care, code-of-conduct, respect`.

### Vyvážení ukazatelů

- Přiměřená volba bezpečí/důvěru převážně nezvyšuje (0 až +5), jen brání pádu,
  a něco stojí (parta, síly). Podceněná volba tlačí k 0, přehnaná k 100.
- Přes noc se vrací +15 sil (`NIGHT_REST`).
- Cíl simulace v `check.html`: hráč se zamýšlenými volbami doplouvá (≥ 90 %),
  náhodný hráč padá.

## Proces

První verzi karet píšeme společně, sekce odpovědnosti ji kontroluje
(vážné karty a texty deníku schvaluje doslova).

## Otevřené body

- Pečeť: formát kódu, ověření v registraci, kdo registraci spravuje.
- Anonymní statistiky (které konce padají) jako podklad pro brífink na místě.
- Termíny.
- Volitelné rozšíření: volba „jak jedeš“ (oddíl/servis) přimíchá pár karet;
  třetí gesto „obrátím se na někoho“.
