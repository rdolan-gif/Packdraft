# Handover: player look research for Google Flow portraits

Start here if you're a new session picking this up. Work on the `dev` branch. Only push to `main` when the
user says "release". Commit trailers: see earlier commits.

## The goal
Go club by club, **smallest roster first** (POR 15 → BIR/WBA/CHA/HUL/QPR/WIG 16 → … largest last). For every card
(one card = one player in one season), find out what the player looked like **that season**, set the look columns
in the player spreadsheet, and write Google Flow prompts in clusters of 8. The user pastes each prompt into
Google Flow with their style reference image (late-90s cartoon caricature, heads and shoulders in shirts, magenta
background) and sends back the results.

**Look at photos; don't guess.** A text-only guess got Sol Campbell wrong (he was bald and clean-shaven in 07-08).
Every look must come from a dated photo as close to the card's season as possible.

## Photo sources
- Wikimedia Commons works (free licence, dated). It rate-limits: throttle (~1.5 s between calls, back off on 429).
  `design/look-research/commons_photos.py cards.json outdir` finds dated photos per card and builds a contact
  sheet per player (closest year first). Read the sheets to see them.
- The user has also allowed: `www.sporting-heroes.net` (match photos by player/club/season: best for exact
  seasons), Flickr (`www.flickr.com`, `api.flickr.com`, `live.staticflickr.com`), Transfermarkt
  (`www.transfermarkt.co.uk`, `img.a.transfermarkt.technology`), Getty (`www.gettyimages.co.uk`,
  `media.gettyimages.com`). Test each first. Getty blocks bots and its terms forbid scraping: last resort only.
- Use photos only to describe features in words. Never put real photos or real names into Flow prompts.

## Files
- `PackDraft38_Players.xlsx` (repo root, gitignored): the player workbook, one tab per club. Look columns:
  Skin Tone, Hair Style, Hair Colour, Facial Hair, Head Shape, Expression, Accessory, Eyes, Nose, Face Detail,
  Look Notes (free text). Allowed values: the Lists tab / `src/types/game.ts` unions. Regenerate with
  `python3 scripts/export_players.py`; validate with `python3 scripts/import_players.py PackDraft38_Players.xlsx --dry-run`.
  Don't import into the game unless the user asks.
- `design/look-research/<CLUB>.json`: research per club: kit text per season (`"GK 07-08"` for keeper kits) and,
  per card id, the look values + `notes` + `confidence` (say which photo/year it came from).
- `design/look-research/make_prompts.py <CLUB>`: writes the research into the workbook rows and creates
  `<CLUB>-prompts.md` (4×2 prompts, cell table with card ids and confidence, no names).

## Status
- **Portsmouth (POR)**: drafted, partly photo-checked.
  - Photo-checked (Commons): David James (short tight curls, not bald), Kanu (short curls), Kranjčar (shoulder-length
    hair, stubble, no alice band), Merson (only a 2007 photo).
  - User-confirmed: Sol Campbell bald and clean-shaven.
  - Still need photos: Distin, Glen Johnson, Hreiðarsson, Primus (04-05), Lassana Diarra, Muntari, Pedro Mendes,
    Crouch (08-09), Defoe, Yakubu (03-04).
  - Kits: royal blue with white trim (Canterbury from 07-08, red socks). The 07-08 GK kit colour is unconfirmed.
- Next: finish POR from photos, send the user the prompts + workbook, then the 16-card clubs.

## Background the user cares about
- They want accuracy for each specific season, and to be told plainly when something is a guess.
- Flow produces 4×2 grids reliably (not 3×3). Keep clusters of 8.
- Earlier attempts to assemble portraits from separate Flow parts (hair/expression layers) looked wrong; the
  current plan is Flow drawing each whole player. That work is in `design/flow/` (reference only).
