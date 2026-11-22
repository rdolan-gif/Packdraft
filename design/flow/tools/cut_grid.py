"""Cut a Google Flow grid of portraits into transparent PNGs, one per cell.

    python3 design/flow/tools/cut_grid.py GRID_IMAGE OUT_DIR [--cols 4 --rows 2 --names a,b,c...]

Finds the cell borders near their expected positions (the darkest line within ±6% of the grid), removes the magenta
background by flood fill from the cell edges (plus any pure-magenta gaps), and trims leftover border slivers.
"""
import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('image')
ap.add_argument('out')
ap.add_argument('--cols', type=int, default=4)
ap.add_argument('--rows', type=int, default=2)
ap.add_argument('--names', default='')
a = ap.parse_args()

A = np.asarray(Image.open(a.image).convert('RGB')).astype(float)
H, W, _ = A.shape
dark = A.sum(2) < 200
pink = lambda c: (c[..., 0] > 150) & (c[..., 2] > 150) & (c[..., 0] - c[..., 1] > 50) & (c[..., 2] - c[..., 1] > 50)


def cuts(n, size, axis):
    """Border positions: the outer edges plus the darkest line near each expected split."""
    cover = dark.mean(axis=axis)
    out = [0]
    for i in range(1, n):
        e = size * i // n
        r = max(4, size * 6 // 100)
        lo, hi = e - r, e + r
        best = lo + int(np.argmax(cover[lo:hi]))
        # widen to the whole dark line
        s, t = best, best
        while s > lo and cover[s - 1] > 0.5 * cover[best]:
            s -= 1
        while t < hi - 1 and cover[t + 1] > 0.5 * cover[best]:
            t += 1
        out.append((s, t))
    out.append(size)
    edges = []
    for i in range(n):
        x0 = out[i] if i == 0 else out[i][1] + 1
        x1 = out[i + 1] if i == n - 1 else out[i + 1][0]
        edges.append((x0, x1))
    return edges


xs = cuts(a.cols, W, 0)
ys = cuts(a.rows, H, 1)
names = a.names.split(',') if a.names else [str(i + 1) for i in range(a.cols * a.rows)]
Path(a.out).mkdir(parents=True, exist_ok=True)
k = 0
for y0, y1 in ys:
    for x0, x1 in xs:
        c = A[y0:y1, x0:x1]
        # trim dark border slivers on each side
        def trim(m, rev):
            idx = range(len(m) - 1, -1, -1) if rev else range(len(m))
            n = 0
            for i in idx:
                if m[i] > 0.3:
                    n += 1
                else:
                    break
            return n
        d = c.sum(2) < 200
        t, b = trim(d.mean(1), False), trim(d.mean(1), True)
        l, r = trim(d.mean(0), False), trim(d.mean(0), True)
        c = c[t + 3:len(c) - b - 1, l + 3:c.shape[1] - r - 3]
        h, w, _ = c.shape
        bg = pink(c)
        seen = np.zeros((h, w), bool)
        q = deque()
        for x in range(w):
            if bg[0, x]:
                seen[0, x] = True
                q.append((0, x))
        for y in range(h):
            for x in (0, w - 1):
                if bg[y, x] and not seen[y, x]:
                    seen[y, x] = True
                    q.append((y, x))
        while q:
            y, x = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bg[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        clear = seen | (pink(c) & (np.abs(c[..., 0] - c[..., 2]) < 60))
        alpha = np.where(clear, 0, 255).astype(np.uint8)
        Image.fromarray(np.dstack([c.astype(np.uint8), alpha]), 'RGBA').save(Path(a.out) / f'{names[k]}.png')
        k += 1
print(f'{k} cells from {a.image} -> {a.out} (cols at {xs}, rows at {ys})')
