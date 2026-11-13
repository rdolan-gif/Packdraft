# PackDraft 38

Rip 11 packs, draft one player from each across every era of the Premier League, then survive a live 38-game season and chase an unbeaten **38-0**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
SINGLE=1 npx vite build   # one self-contained HTML file in dist-single/
```

## What's in it

- **Mystery Manager draft**: 3 of 6 tactical philosophies, each with a passive rating buff (`src/data/managers.ts`, `src/engine/chemistry.ts`).
- **Formations**: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2 and the 4-1-2-1-2 diamond. Lock one upfront, or keep it open until your third pick.
- **11-pack draft**: 249 cards across 114 players and 4 rarity tiers (`src/data/players.ts`). Drag the foil strip or tap to rip a pack. Each tier gets its own flash, and Prime Icons get a full walkout. One Scout Reroll per run.
- **Pack engine** (`src/engine/packGenerator.ts`): no duplicate players, pity weighting from pack 6, guaranteed slot fits in packs 9–11, and a Captain's Finale (pack 11) with a guaranteed 86+ card at double Prime odds.
- **Procedural art and sound**: SVG caricatures (`PlayerCaricature.tsx`) and a Web Audio synth (`soundEffects.ts`). There are no external image or audio files.
- **Live season** (`seasonSimulator.ts`): minute-by-minute Poisson sim, a 20-team table, a results ticker and Golden Boot / Playmaker / Golden Glove leaderboards. Tactical pauses come at MW19 (against your closest rival) and at MW38 when something is at stake.
- **Review card**: grades from F to S+ with a stamp reveal, the Scout's Verdict, awards and a copyable emoji share grid.
- **Trophy Vault**: S, S+ and unbeaten squads plus career stats, saved in `localStorage`.
