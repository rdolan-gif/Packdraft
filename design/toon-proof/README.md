# Toon portraits + sticker cards: proof (not in the game yet)

- `Toon.tsx`: the redrawn vector portrait parts in the late-90s cartoon style (same traits as the spreadsheet),
  with the ink-wobble filter and the "boil" animation.
- `flow8.ts`: the traits used to redraw the 8 players from the Google Flow reference grid.
- `Panini.tsx` + `panini.css`: card mockups. A = sticker album, B = 90s trading card. All five rarities.
- `flow8.png`, `cards.png`, `shinies.gif`: the renders shown to the user.

These files import from `src/` as if they lived in `src/toon/`; copy them there to build them.
