"""Apply a club's look research to the player workbook and write its Google Flow prompts.

    python3 design/look-research/make_prompts.py POR [workbook.xlsx]

Reads design/look-research/<CLUB>.json, sets each card's look columns and Look Notes on the workbook
(default: PackDraft38_Players.xlsx), and writes design/look-research/<CLUB>-prompts.md: one prompt per
8 cards, in the 4x2 template, with no real names.
"""
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
club = sys.argv[1]
book = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'PackDraft38_Players.xlsx'
data = json.loads((ROOT / f'design/look-research/{club}.json').read_text())

SKIN = {'pale': 'pale', 'freckled': 'pale with freckles', 'light': 'light', 'tan': 'tan', 'olive': 'olive', 'brown': 'brown', 'dark': 'dark brown', 'deep': 'deep dark brown'}
HAIR = {'bald': 'completely bald', 'buzz': 'buzz cut', 'short': 'short textured', 'quiff': 'quiff', 'slick': 'slicked back', 'sidepart': 'neat side parting', 'fringe': 'straight fringe',
        'curtains': '90s curtains with a centre parting', 'bowl': 'bowl cut', 'flattop': 'flat-top', 'spiky': 'spiky', 'frosted': 'frosted tips', 'gelled': 'wet-look gelled spikes',
        'fade': 'skin fade with a crisp line-up', 'hightop': 'high-top fade', 'shavedline': 'shaved head with a shaved line design', 'mohawk': 'mohawk', 'curly': 'tight curls',
        'afro': 'big afro', 'twists': 'twists', 'cornrows': 'cornrows flat to the head', 'braids': 'braids with hanging ends', 'dreads': 'dreadlocks', 'long': 'long hair with a centre parting',
        'longwavy': 'long wavy hair', 'ponytail': 'ponytail', 'manbun': 'man-bun', 'mullet': 'mullet', 'receding': 'receding hairline'}
COLOUR = {'black': 'black', 'darkbrown': 'dark brown', 'brown': 'brown', 'blonde': 'blonde', 'ginger': 'ginger', 'grey': 'grey', 'bleached': 'bleached platinum'}
FACIAL = {'none': 'clean-shaven', 'stubble': 'light stubble', 'moustache': 'moustache', 'goatee': 'goatee', 'soulpatch': 'soul patch', 'chinstrap': 'chin strap beard', 'beard': 'short beard', 'fullbeard': 'full thick beard'}
HEAD = {'round': 'round', 'oval': 'oval', 'square': 'square jaw', 'long': 'long and narrow', 'heart': 'heart-shaped', 'flattop': 'wide flat-top skull', 'pear': 'pear-shaped', 'rugby': 'rugby-ball shaped'}
EXPR = {'calm': 'calm smile', 'grin': 'big grin showing teeth', 'smirk': 'smirk', 'determined': 'determined', 'roar': 'roaring/shouting', 'cool': 'cool and relaxed', 'focused': 'focused', 'tongue': 'cheeky tongue out'}
EYES = {'standard': 'standard', 'dot': 'small dot eyes', 'heavy': 'heavy-lidded', 'wide': 'wide', 'narrow': 'narrow'}
NOSE = {'standard': 'standard', 'button': 'button', 'long': 'long', 'bulbous': 'bulbous', 'hooked': 'hooked'}
ACC = {'none': None, 'headband': 'thin headband', 'sweatband': 'sweatband', 'alice': 'thin alice band', 'scrumcap': 'scrum cap', 'goggles': 'sports goggles', 'facemask': 'clear face mask',
       'bandage': 'head bandage', 'earring': 'stud earring', 'captainband': "captain's armband on the upper arm", 'snood': 'snood'}
DETAIL = {'none': None, 'plaster': 'plaster on the cheek', 'nosestrip': 'nose strip', 'scar': 'scar through the eyebrow', 'blackeye': 'black eye', 'gaptooth': 'gap-toothed grin'}

HEADER = """Use the attached image as the style and framing reference. Create ONE image: a 4×2 grid (4 across, 2 rows) of 8 ORIGINAL fictional footballers, numbered left to right, top row first.

STYLE (every cell): late-1990s TV cartoon caricature, exactly like the reference. Hand-inked, slightly wobbly dark navy outlines (#161C2B), thicker on the outside. Flat colours, minimal shading, no gradients, no rosy cheeks. Exaggerated but friendly caricature proportions.

FRAMING (identical in every cell): front-facing and symmetrical, from the top of the head down to mid-chest. Every head the same size and at the same height in its cell, with the shoulders reaching the edges of the cell. A short neck shows between the chin and the collar, and goes inside the collar. Each cell is a separate drawing: nothing crosses between cells. Flat solid magenta background (#FF00FF). No logos, crests, sponsors, numbers, names or text anywhere.

PLAYERS:"""

# ── apply to the workbook
wb = load_workbook(book)
cols = {'Skin Tone': 'skinTone', 'Hair Style': 'hairStyle', 'Hair Colour': 'hairColor', 'Facial Hair': 'facialHair', 'Head Shape': 'headShape', 'Expression': 'expression',
        'Accessory': 'accessory', 'Eyes': 'eyes', 'Nose': 'nose', 'Face Detail': 'detail', 'Look Notes': 'notes'}
rows = {}
for ws in wb.worksheets:
    head = {c.value: i + 1 for i, c in enumerate(ws[1]) if c.value}
    if not {'Player ID', 'Season', 'Look Notes'} <= set(head):
        continue
    for r in range(2, ws.max_row + 1):
        pid, season = ws.cell(r, head['Player ID']).value, ws.cell(r, head['Season']).value
        if pid and season:
            rows[f"{pid}_{str(season).replace('-', '')}"] = (ws, r, head)
missing = [cid for cid in data['cards'] if cid not in rows]
if missing:
    raise SystemExit(f'Not in the workbook: {missing}')
cards = []
for cid, look in data['cards'].items():
    ws, r, head = rows[cid]
    for h, k in cols.items():
        ws.cell(r, head[h], look.get(k, ''))
    g = lambda h: ws.cell(r, head[h]).value
    cards.append(dict(id=cid, season=str(g('Season')), pos=str(g('Positions')).split('/')[0], nation=g('Nation'), look=look))
wb.save(book)

# ── prompts
def kit(c):
    return data['kits'].get(f"GK {c['season']}") if c['pos'] == 'GK' and f"GK {c['season']}" in data['kits'] else data['kits'][c['season']]

def line(i, c):
    L = c['look']
    acc = [x for x in (ACC.get(L['accessory']), DETAIL.get(L.get('detail', 'none'))) if x]
    hair = 'none (bald)' if L['hairStyle'] == 'bald' else HAIR[L['hairStyle']]
    s = (f"{i}. Head shape: {HEAD[L['headShape']]}. Skin tone: {SKIN[L['skinTone']]}. Nationality: {c['nation']}. Hairstyle: {hair}. "
         f"Hair colour: {COLOUR[L['hairColor']]}. Facial hair: {FACIAL[L['facialHair']]}. Eyes: {EYES[L.get('eyes', 'standard')]}. Nose: {NOSE[L.get('nose', 'standard')]}. "
         f"Expression: {EXPR[L['expression']]}. Accessories: {', '.join(acc) if acc else 'none'}. Shirt: {kit(c)}.")
    if L.get('notes'):
        s += f" Details: {L['notes']}."
    return s

order = sorted(cards, key=lambda c: (c['pos'] != 'GK', c['id']))
out = [f'# {club} · Google Flow prompts ({len(order)} cards)\n', 'Attach your style reference image with every prompt.\n']
for n in range(0, len(order), 8):
    group = order[n:n + 8]
    out.append(f'\n## Prompt {n // 8 + 1}: cards {n + 1}–{n + len(group)}\n')
    out.append('| Cell | Card | Confidence |\n|---|---|---|')
    out += [f"| {i} | {c['id']} | {c['look'].get('confidence', '')} |" for i, c in enumerate(group, 1)]
    body = [line(i, c) for i, c in enumerate(group, 1)]
    if len(group) < 8:
        body += [f'{i}. Leave this cell empty: flat magenta only.' for i in range(len(group) + 1, 9)]
    out.append('\n```\n' + HEADER + '\n' + '\n'.join(body) + '\n```')
path = ROOT / f'design/look-research/{club}-prompts.md'
path.write_text('\n'.join(out) + '\n')
print(f'Updated {len(cards)} rows in {book.name}; wrote {path.relative_to(ROOT)}')
