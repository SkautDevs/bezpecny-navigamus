# Bezpečný Navigamus

Tréninková swipe hra o bezpečí a pravidlech na Navigamu 2027. Nahrazuje povinný
test „Bezpečný Navigamus“.

**Hrát:** https://skautdevs.github.io/bezpecny-navigamus/

## Spuštění lokálně

Hra je čisté HTML, CSS a JS bez buildu a závislostí. Potřebuje jen lokální web
server, protože z `file://` prohlížeč nenačte JS moduly ani karty.

```sh
python3 -m http.server 8000
```

Pak otevři http://localhost:8000/ (hra) nebo http://localhost:8000/check.html
(kontrola karet).

## Veřejná verze

Běží na GitHub Pages z větve `main`. Každý push na `main` hru do pár minut
aktualizuje, nic dalšího se nespouští.

## Kde se co najde

| Soubor | Co v něm je |
| --- | --- |
| `data/cards.json` | Všech 100 karet: texty, volby, dopady, zápisy do deníku |
| `data/endings.json` | Konce hry: pády, dobré konce, tajný Kormidelník |
| `index.html`, `style.css` | Obrazovky a vzhled hry |
| `js/engine.js` | Pravidla hry bez UI: ukazatele, balíček, konce |
| `js/game.js` | Ovládání a vykreslování hry |
| `check.html`, `js/check.js` | Validace karet, simulace 2000 her a čitelný scénář pro sekci |
| `DESIGN.md` | Návrh hry, pravidla psaní karet, schéma karty, otevřené body |

Kartu upravíš v `data/cards.json`. Pak otevři `check.html` a zkontroluj, že
nehlásí chyby a simulace je vyvážená.
