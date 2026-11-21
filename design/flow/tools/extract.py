"""Extract the Google Flow asset sheets into aligned, game-ready layers.

    python3 design/flow/tools/extract.py

For every sheet in design/flow/sheets: find the grid cells, key out the magenta, align every cell to the
MASTER base head (01-base-head.jpg) with an affine fit, then isolate the asset as the pixels that differ
from the base head. Writes design/flow/assets/<category>/<name>.png (full aligned head + layer) and
design/flow/assets/manifest.json with alignment scores, plus contact sheets in design/flow/check/.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / 'sheets'
OUT = ROOT / 'assets'
CHECK = ROOT / 'check'

# Canvas every asset is aligned into (the master base head is centred in it).
CW, CH = 640, 900

# What each cell holds, row by row. Cell 0 is always the sheet's own copy of the base head.
SHEET_MAP = {
    '02-head-shapes': ('head', ['base', 'round', 'oval', 'square', 'long', 'heart', 'flattop', 'pear', 'rugby']),
    '03-skin-tones': ('skin', ['base'] + [f'tone{i:02d}' for i in range(1, 15)]),
    '04-hair-1': ('hair', ['base', 'buzz', 'short', 'quiff', 'afro', 'ponytail', 'long', 'mohawk']),
    '05-hair-a': ('hair', ['base', 'afro', 'mohawk', 'slick', 'dreads', 'spiky', 'manbun', 'fringe']),
    '06-hair-b': ('hair', ['base', 'braids', 'receding', 'mullet', 'curtains', 'sidepart', 'frosted', 'gelled']),
    '07-hair-c': ('hair', ['base', 'fade', 'twists', 'flattop', 'shavedline', 'hightop', 'bowl', 'longwavy']),
    '08-facial-hair': ('facial', ['base', 'stubble', 'goatee', 'moustache', 'beard', 'fullbeard', 'chinstrap', 'soulpatch']),
    '09-hair-colours': ('haircolour', ['base', 'black', 'darkbrown', 'brown', 'blonde', 'ginger', 'grey', 'bleached']),
    '10-expressions': ('expression', ['base', 'grin', 'smirk', 'determined', 'roar', 'cool', 'focused', 'tongue']),
    '11-accessories': ('accessory', ['base', 'headband', 'sweatband', 'alice', 'scrumcap', 'goggles', 'earring', 'plaster']),
    '12-noses-eyes': ('feature', ['base', 'nose-button', 'nose-long', 'nose-bulbous', 'nose-hooked', 'eyes-dot', 'eyes-heavy', 'eyes-wide']),
    '13-extras': ('extra', ['base', 'nosestrip', 'snood', 'facemask', 'bandage', 'scar', 'blackeye', 'gaptooth']),
}


def magenta_score(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r + b) / 2 - g


GRIDS = {'02-head-shapes': (3, 3), '03-skin-tones': (5, 3)}


def find_cells(img, cols=4, rows=2):
    """Cell boxes in reading order, from the dark grid lines (searched near the expected positions)."""
    H, W = img.shape[:2]
    dark = img.mean(-1) < 80

    def cuts(profile, n, length):
        out = [0]
        for i in range(1, n):
            c = int(i * length / n)
            w = int(length * 0.06)
            seg = profile[c - w: c + w]
            out.append(c - w + int(np.argmax(seg)))
        out.append(length)
        return out

    xs = cuts(dark.mean(0), cols, W)
    ys = cuts(dark.mean(1), rows, H)
    return [(ys[r], xs[c], ys[r + 1], xs[c + 1]) for r in range(rows) for c in range(cols)]


def key_cell(rgb):
    """RGBA of the drawing in a cell, magenta removed, grid scraps dropped."""
    score = magenta_score(rgb)
    alpha = np.clip((150 - score) / 70, 0, 1)
    lab, n = ndi.label(alpha > 0.5)
    H, W = alpha.shape
    keep = np.zeros_like(alpha, bool)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        comp = lab[sl] == i
        area = comp.sum()
        thin = h < 14 or w < 14
        touches = sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == H or sl[1].stop == W
        if area > 60 and not (thin and touches) and not (touches and area < H * W * 0.02):
            keep[sl] |= comp
    keep = ndi.binary_fill_holes(ndi.binary_closing(keep, iterations=2))
    alpha = alpha * ndi.binary_dilation(keep, iterations=2)
    mag = np.array([235, 30, 235], np.float32)
    a3 = np.clip(alpha, 0.05, 1)[..., None]
    out = np.where(a3 < 0.98, np.clip((rgb - (1 - a3) * mag) / a3, 0, 255), rgb)
    return np.dstack([out, alpha * 255]).astype(np.float32)


def edges(rgba):
    """Ink map used for alignment: dark outline pixels, blurred a little."""
    g = rgba[..., :3].mean(-1)
    ink = ((g < 90) & (rgba[..., 3] > 128)).astype(np.float32)
    return cv2.GaussianBlur(ink, (0, 0), 1.6)


def fit(src, dst, mask, init):
    """Affine transform (2x3) mapping src pixels onto dst, fitted where mask is set."""
    warp = init.astype(np.float32).copy()
    try:
        _, warp = cv2.findTransformECC(dst, src, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), mask.astype(np.uint8), 5)
    except cv2.error:
        pass
    return warp


def bbox_init(src_a, dst_a, region):
    """Starting guess: match the head's lower half (ears to chin) by box."""
    def box(a):
        ys, xs = np.where(a > 128)
        y0, y1 = ys.min(), ys.max()
        band = a[int(y0 + (y1 - y0) * region): y1]
        ys2, xs2 = np.where(band > 128)
        return xs2.min(), xs2.max(), y1
    sx0, sx1, sy1 = box(src_a)
    dx0, dx1, dy1 = box(dst_a)
    k = (dx1 - dx0) / max(1, sx1 - sx0)
    tx = dx0 - sx0 * k
    ty = dy1 - sy1 * k
    return np.array([[k, 0, tx], [0, k, ty]], np.float32)


def search(src_edge, tmpl, tbox):
    """Scale + translation search: where does the master's stable outline (tmpl, cut at tbox) best fit in src?"""
    ty0, tx0 = tbox
    best = (-1, None)
    for k in np.arange(0.45, 2.6, 0.03):
        sc = cv2.resize(src_edge, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
        if sc.shape[0] < tmpl.shape[0] or sc.shape[1] < tmpl.shape[1]:
            continue
        r = cv2.matchTemplate(sc, tmpl, cv2.TM_CCORR_NORMED)
        _, v, _, loc = cv2.minMaxLoc(r)
        if v > best[0]:
            best = (v, np.array([[k, 0, tx0 - loc[0]], [0, k, ty0 - loc[1]]], np.float32))
    return best[1]


def on_canvas(rgba, warp):
    return cv2.warpAffine(rgba, warp, (CW, CH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def main():
    OUT.mkdir(exist_ok=True)
    CHECK.mkdir(exist_ok=True)
    # ── the master base head, centred on the canvas
    master_img = np.asarray(Image.open(SHEETS / '01-base-head.jpg').convert('RGB')).astype(np.float32)
    mrgba = key_cell(master_img)
    ys, xs = np.where(mrgba[..., 3] > 128)
    k = (CH * 0.62) / (ys.max() - ys.min())
    cx, top = (xs.min() + xs.max()) / 2, ys.min()
    mwarp = np.array([[k, 0, CW / 2 - cx * k], [0, k, CH * 0.2 - top * k]], np.float32)
    master = on_canvas(mrgba, mwarp)
    Image.fromarray(master.astype(np.uint8)).save(OUT / 'base-head.png')
    medge = edges(master)
    ma = master[..., 3]
    ys, xs = np.where(ma > 128)
    y0, y1 = ys.min(), ys.max()
    # Region that stays the same in every variant: ears and face from the brows down (not the scalp).
    stable = np.zeros_like(ma, bool)
    stable[int(y0 + (y1 - y0) * 0.33): int(y0 + (y1 - y0) * 0.92)] = True
    stable &= ndi.binary_dilation(ma > 128, iterations=6)

    hy0, hy1 = y0, y1
    face = master[(ma > 128) & (master[..., :3].mean(-1) > 110)][:, :3]
    lum = face.mean(-1)
    skin_cols = [np.median(face[lum >= np.median(lum)], 0), np.median(face[lum < np.median(lum)], 0)]
    head = ma > 128
    ring = ndi.binary_dilation(head, iterations=14) & ~ndi.binary_erosion(head, iterations=6)
    ys2, xs2 = np.where(stable)
    tbox = (ys2.min(), xs2.min())
    tmpl = (medge * stable)[ys2.min():ys2.max() + 1, xs2.min():xs2.max() + 1].astype(np.float32)
    manifest = {'canvas': [CW, CH], 'sheets': {}}
    for sheet, (cat, names) in SHEET_MAP.items():
        img = np.asarray(Image.open(next(SHEETS.glob(f'{sheet}.*'))).convert('RGB')).astype(np.float32)
        boxes = find_cells(img, *GRIDS.get(sheet, (4, 2)))
        entry = {'cells_found': len(boxes), 'cells_expected': len(names), 'items': {}}
        if len(boxes) != len(names):
            entry['fault'] = f'found {len(boxes)} cells, expected {len(names)}'
        (OUT / cat).mkdir(exist_ok=True)
        tiles = []
        base_warp = None
        for name, (y0b, x0b, y1b, x1b) in zip(names, boxes):
            cell = key_cell(img[y0b + 10: y1b - 10, x0b + 10: x1b - 10])
            mask = stable.copy()
            if cat in ('expression', 'feature', 'extra'):
                inner = ndi.binary_erosion(ma > 128, iterations=14)
                mask &= ~inner
            if cat == 'head':
                mask = ndi.binary_erosion(ma > 128, iterations=18)
                mask[: int(hy0 + (hy1 - hy0) * 0.36)] = False
                mask[int(hy0 + (hy1 - hy0) * 0.8):] = False
            ce = edges(cell)

            def score_of(w):
                e = edges(on_canvas(cell, w)) > 0.3
                b_ = medge > 0.3
                reg = mask & (e | b_)
                return float((e & b_ & reg).sum() / max(1, reg.sum()))

            cands = [fit(ce, medge, mask, search(ce, tmpl, tbox))]
            if base_warp is not None:
                cands.append(fit(ce, medge, mask, base_warp))
            # a fit that warps the drawing (shear or uneven scale) is wrong whatever its score
            ok = [w for w in cands if abs(w[0, 0] / w[1, 1] - 1) < 0.06 and abs(w[0, 1]) < 0.06 and abs(w[1, 0]) < 0.06]
            warp = max(ok or cands, key=score_of)
            if base_warp is None:
                base_warp = warp.copy()
            al = on_canvas(cell, warp)
            # How well the unchanged parts line up: overlap of ink in the stable region.
            a_ink, b_ink = edges(al) > 0.3, medge > 0.3
            region = mask & (a_ink | b_ink)
            score = float((a_ink & b_ink & region).sum() / max(1, region.sum()))
            scale = float(np.sqrt(abs(np.linalg.det(warp[:, :2]))))
            # The asset layer: what differs from the base head (colour change, or new shape outside it).
            # Colour difference to the nearest matching base pixel within 3px, so outlines drawn a pixel or
            # two off don't count as new. Skin-to-skin changes (Flow re-shading the cheeks) need a bigger change.
            diff = np.full(al.shape[:2], 1e9, np.float32)
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    sh = np.roll(np.roll(master, dy, 0), dx, 1)
                    d = np.abs(al[..., :3] - sh[..., :3]).sum(-1) + (sh[..., 3] < 128) * 1e6
                    diff = np.minimum(diff, d)
            skin = (master[..., 3] > 128) & (master[..., :3].mean(-1) > 120) & (al[..., :3].mean(-1) > 110)
            thresh = np.where(skin & (cat not in ('skin', 'haircolour')), 105 if cat == 'facial' else 150, 75)
            new = (al[..., 3] > 128) & ((master[..., 3] < 128) | (diff > thresh))
            # skin-coloured pixels are never hair or beard (bare shoulders, re-shaded jaw)
            sk = np.min(np.stack([np.abs(al[..., :3] - c).sum(-1) for c in skin_cols]), 0) < 48
            if cat in ('hair', 'facial', 'head', 'skin'):
                new &= ~(sk & (cat in ('hair', 'facial')))
            new &= ~(sk & (master[..., 3] < 128) & (cat != 'skin'))
            if cat == 'hair':
                # anything not skin on the scalp/forehead is hair (light hair is close in value to skin)
                upper = np.zeros_like(new)
                upper[: int(hy0 + (hy1 - hy0) * 0.36)] = True
                new |= (al[..., 3] > 128) & ~sk & upper
            if cat == 'facial':
                new[: int(hy0 + (hy1 - hy0) * 0.52)] = False
            new = ndi.binary_opening(new, iterations=1)
            lab, n = ndi.label(new)
            keep = []
            for i, sl in enumerate(ndi.find_objects(lab), 1):
                comp = lab[sl] == i
                area = comp.sum()
                in_ring = (comp & ring[sl]).sum() / max(1, area)
                # drop specks, and slivers that just hug the base head's outline (crown drawn a touch differently)
                px = al[sl][comp][:, :3]
                inkish = (px.mean(-1) < 48).mean()
                outside = (~head[sl][comp]).mean()
                skinish = (np.min(np.stack([np.abs(px - c).sum(-1) for c in skin_cols]), 0) < 90).mean()
                pinkish = ((px[:, 0] > px[:, 1] + 25) & (px[:, 2] > px[:, 1] + 10) & (px.mean(-1) > 100)).mean()
                plain = inkish + skinish + pinkish > 0.8   # nothing but outline and skin: a redrawn edge, not an asset
                cy = sl[0].start + np.where(comp)[0].mean()
                edge_zone = cy < hy0 + (hy1 - hy0) * 0.2 or cy > hy1 - (hy1 - hy0) * 0.02
                if plain and edge_zone and outside > 0.5:
                    continue
                if area <= (40 if cat in ('facial', 'feature', 'expression', 'extra') else 120):
                    continue
                if in_ring > 0.6 and plain and area < 6000:
                    continue
                if cat in ('hair', 'facial') and inkish > 0.7 and area < 3000:
                    continue
                keep.append(i)
            new = np.isin(lab, keep)
            new = ndi.binary_dilation(ndi.binary_closing(new, iterations=2), iterations=1)
            layer = al.copy()
            layer[..., 3] = np.where(new, al[..., 3], 0)
            Image.fromarray(al.astype(np.uint8)).save(OUT / cat / f'{name}-full.png')
            if name != 'base':
                Image.fromarray(layer.astype(np.uint8)).save(OUT / cat / f'{name}.png')
            entry['items'][name] = {'align': round(score, 3), 'scale': round(scale, 3), 'layer_px': int(new.sum())}
            # contact-sheet tile: aligned head, base outline in red over it, then the isolated layer on grey
            t = np.zeros((CH, CW * 2, 3), np.uint8) + 40
            comp = al[..., :3] * (al[..., 3:] / 255) + 40 * (1 - al[..., 3:] / 255)
            comp[medge > 0.35] = [255, 40, 40]
            t[:, :CW] = comp.astype(np.uint8)
            lay = layer[..., :3] * (layer[..., 3:] / 255) + 90 * (1 - layer[..., 3:] / 255)
            t[:, CW:] = lay.astype(np.uint8)
            tiles.append(cv2.putText(t, f'{name} {score:.2f}', (10, 34), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 0), 2))
        if cat == 'skin':
            pal = {}
            for nm, (y0b, x0b, y1b, x1b) in zip(names, boxes):
                c = key_cell(img[y0b + 14: y1b - 14, x0b + 14: x1b - 14])
                a = ndi.binary_erosion(c[..., 3] > 200, iterations=10)
                px = c[a][:, :3]
                q = (px // 12).astype(int)
                keys, counts = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2], return_counts=True)
                top = keys[np.argmax(counts)]
                base = px[(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]) == top].mean(0)
                lum, bl = px.mean(-1), base.mean()
                shade = np.median(px[(lum > bl * 0.6) & (lum < bl * 0.9)], 0)
                hexs = lambda v: '#' + ''.join(f'{int(x):02x}' for x in v)
                pal[nm] = {'base': hexs(base), 'shade': hexs(shade)}
            entry['palette'] = pal
        if cat == 'haircolour':
            ref = np.asarray(Image.open(OUT / 'haircolour' / 'darkbrown.png'))[..., 3] > 128
            ref = ndi.binary_erosion(ref, iterations=3)
            pal = {}
            for nm in names[1:]:
                px = np.asarray(Image.open(OUT / 'haircolour' / f'{nm}-full.png')).astype(np.float32)[ref][:, :3]
                px = px[px.mean(-1) > 25] if nm != 'black' else px
                lum2 = px.mean(-1)
                hexs = lambda c: '#' + ''.join(f'{int(v):02x}' for v in c)
                pal[nm] = {'base': hexs(np.median(px, 0)), 'shade': hexs(np.percentile(px, 15, axis=0)), 'hi': hexs(np.percentile(px, 92, axis=0))}
            entry['palette'] = pal
        manifest['sheets'][sheet] = entry
        cols = 4
        rows = (len(tiles) + cols - 1) // cols
        sheet_img = np.zeros((rows * CH, cols * CW * 2, 3), np.uint8)
        for i, t in enumerate(tiles):
            r, c = divmod(i, cols)
            sheet_img[r * CH:(r + 1) * CH, c * CW * 2:(c + 1) * CW * 2] = t
        Image.fromarray(sheet_img).resize((sheet_img.shape[1] // 3, sheet_img.shape[0] // 3)).save(CHECK / f'{sheet}.png')
        print(sheet, entry.get('fault', 'ok'), {k: v['align'] for k, v in entry['items'].items()})
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))


if __name__ == '__main__':
    main()
