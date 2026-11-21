"""Pick the final assets from design/flow/assets into design/flow/library (names match the game's trait lists)."""
import json, shutil
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
A, L = ROOT / 'assets', ROOT / 'library'
man = json.loads((A / 'manifest.json').read_text())

# best version of each duplicate: afro and mohawk come from Hair A (cleaner afro, shaved-side mohawk)
PICK = {
    'hair': {
        'buzz': '04-hair-1', 'short': '04-hair-1', 'quiff': '04-hair-1', 'ponytail': '04-hair-1', 'long': '04-hair-1',
        'afro': '05-hair-a', 'mohawk': '05-hair-a', 'slick': '05-hair-a', 'dreads': '05-hair-a', 'spiky': '05-hair-a', 'manbun': '05-hair-a', 'fringe': '05-hair-a',
        'braids': '06-hair-b', 'receding': '06-hair-b', 'mullet': '06-hair-b', 'curtains': '06-hair-b', 'sidepart': '06-hair-b', 'frosted': '06-hair-b', 'gelled': '06-hair-b',
        'fade': '07-hair-c', 'twists': '07-hair-c', 'flattop': '07-hair-c', 'shavedline': '07-hair-c', 'hightop': '07-hair-c', 'bowl': '07-hair-c', 'longwavy': '07-hair-c',
    },
}
# game skin tones -> sheet tones (nearest by eye and value); the rest are kept as extra tones
SKIN_MAP = {'pale': 'tone01', 'light': 'tone02', 'tan': 'tone04', 'olive': 'tone07', 'brown': 'tone08', 'dark': 'tone10', 'deep': 'tone11'}

if L.exists():
    shutil.rmtree(L)
L.mkdir()
lib = {'canvas': man['canvas'], 'base': 'base-head.png', 'layers': {}, 'palettes': {}}
Image.open(A / 'base-head.png').save(L / 'base-head.png', optimize=True)
sheet_of = {}
for sheet, e in man['sheets'].items():
    for item in e['items']:
        sheet_of.setdefault(item, []).append(sheet)
for sheet, e in man['sheets'].items():
    cat = {'02': 'head', '03': 'skin', '08': 'facial', '09': 'haircolour', '10': 'expression', '11': 'accessory', '12': 'feature', '13': 'extra'}.get(sheet[:2], 'hair')
    if cat in ('skin', 'haircolour'):
        continue
    for name, info in e['items'].items():
        if name == 'base':
            continue
        if cat == 'hair' and PICK['hair'].get(name) != sheet:
            continue
        (L / cat).mkdir(exist_ok=True)
        src = A / ('head' if cat == 'head' else cat if cat != 'hair' else 'hair') / (f'{name}-full.png' if cat == 'head' else f'{name}.png')
        im = Image.open(src)
        box = im.getbbox() or (0, 0, 1, 1)
        im.crop(box).save(L / cat / f'{name}.png', optimize=True)
        lib['layers'].setdefault(cat, {})[name] = {'file': f'{cat}/{name}.png', 'x': box[0], 'y': box[1], 'from': sheet, 'align': info['align'], 'px': info['layer_px']}
skin = man['sheets']['03-skin-tones']['palette']
lib['palettes']['skin'] = {k: skin[v] for k, v in SKIN_MAP.items()}
lib['palettes']['skinExtra'] = {k: v for k, v in skin.items() if k not in SKIN_MAP.values() and k != 'base'}
lib['palettes']['hair'] = man['sheets']['09-hair-colours']['palette']
lib['palettes']['hairSource'] = 'brown'  # every hair and facial-hair layer is drawn in this colour, recolour from it
(L / 'library.json').write_text(json.dumps(lib, indent=1))
print({k: len(v) for k, v in lib['layers'].items()}, 'files', sum(1 for _ in L.rglob('*.png')))
