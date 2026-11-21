# Google Flow portrait library

- `reference/`: the style masters (90s face grid, players in shirts, shirt templates).
- `sheets/`: the original Flow sheets, untouched. Cell 1 of every sheet is the base head.
- `tools/extract.py`: cuts every cell out, removes the magenta, aligns it to the master base head
  (`sheets/01-base-head.jpg`) and isolates the asset as the pixels that differ from the base head.
  Intermediate output goes to `assets/` (not in git; rerun to recreate).
- `tools/build_library.py`: picks the final assets into `library/`, cropped, with their position.
- `library/library.json`: every layer (file, x/y on the 640×900 canvas, source sheet, alignment score),
  plus skin and hair colour palettes. Hair and facial hair are drawn in brown; recolour them using `palettes.hair`.
- `check/`: contact sheets. Left of each pair = the aligned drawing with the base head's outline in red;
  right = the isolated layer.

## Library contents

| Category | Items |
|---|---|
| Head shapes (whole-head replacements) | round, oval, square, long, heart, flattop, pear, rugby |
| Skin tones (palettes) | pale, light, tan, olive, brown, dark, deep, plus 7 extra tones |
| Hair (26) | buzz, short, quiff, ponytail, long, afro, mohawk, slick, dreads, spiky, manbun, fringe, braids, receding, mullet, curtains, sidepart, frosted, gelled, fade, twists, flattop, shavedline, hightop, bowl, longwavy |
| Hair colours (palettes) | black, darkbrown, brown, blonde, ginger, grey, bleached |
| Facial hair | stubble, goatee, moustache, beard, fullbeard, chinstrap, soulpatch |
| Expressions | grin, smirk, determined, roar, cool, focused, tongue |
| Noses / eyes | nose-button, nose-long, nose-bulbous, nose-hooked, eyes-dot, eyes-heavy, eyes-wide |
| Accessories | headband, sweatband, alice, scrumcap, goggles, earring, plaster |
| Extras | nosestrip, snood, facemask, bandage, scar, blackeye, gaptooth |

Duplicates: afro and mohawk taken from Hair A (cleaner afro; mohawk with shaved sides).

## Faults found

**Needs a redo in Flow (or accept as is)**
1. **Low resolution.** Most sheets are 1376×768 (heads ~220 px wide). Fine for small cards, soft on large cards
   and the season card. Re-download at 2K/4K if Flow offers it.
2. **Head shapes:** `flattop` isn't flat-topped (just a smaller head) and `long` / `oval` barely differ from the base.
3. **Cornrows** came out as braids with hanging tails (kept as `braids`); there's no flat cornrow style.
4. **Freckles** only exist as two pale skin tones; there's no freckle layer to put on other tones.
5. **Frosted** hair colour wasn't drawn (dropped to fit the sheet); the `frosted` hairstyle covers it.

**Handled in processing (no action needed)**
6. Hair B sheet was drawn with bare shoulders: removed from its layers.
7. Flow redrew the crown and outlines slightly differently per cell: thin outline slivers removed.
8. Re-shaded skin around beards was picked up as beard: removed.

**Limits to plan for when building into the game**
9. **Hair and accessories are drawn for the base head shape.** On round, pear or heart heads they'll need scaling
   to that head's skull width, and won't be a perfect fit.
10. **`roar`** changes the jaw outline, so on other head shapes the jaw edge won't line up.
11. **Expressions include eyebrows in brown**, so brows need recolouring with the hair colour.
12. **Earring** is tiny (about 20 px): barely visible on small cards.
13. **Long hair, dreads and long wavy** are single front layers; they hang over the neck and shirt, never behind.
