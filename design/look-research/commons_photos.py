"""Find dated Commons photos of players and build one contact sheet per player.
Usage: commons.py cards.json outdir   (cards: [{id, name, season}])"""
import json, sys, re, io, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw
cards = json.load(open(sys.argv[1])); OUT = sys.argv[2]
UA = {'User-Agent': 'PackDraftLookResearch/1.0 (personal game project)'}
def get(url, raw=False):
    req = urllib.request.Request(url, headers=UA)
    for i in range(5):
        try:
            time.sleep(1.5)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read() if raw else json.loads(r.read())
        except Exception as e:
            err = e; time.sleep(8 * (i + 1))
    raise err
API = 'https://commons.wikimedia.org/w/api.php?'
import os
for c in cards:
    if os.path.exists(f'{OUT}/{c["id"]}.jpg'): continue
    yy = int(c['season'][:2]); year = 1900 + yy if yy >= 90 else 2000 + yy
    q = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': f'{c["name"]} football', 'gsrnamespace': 6, 'gsrlimit': 30,
         'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 360}
    try:
        res = get(API + urllib.parse.urlencode(q)).get('query', {}).get('pages', {})
    except Exception as e:
        print(c['id'], 'search failed', e); continue
    items = []
    for p in res.values():
        ii = (p.get('imageinfo') or [{}])[0]
        md = ii.get('extmetadata', {})
        d = (md.get('DateTimeOriginal', {}).get('value') or md.get('DateTime', {}).get('value') or '')
        m = re.search(r'(19|20)\d\d', re.sub('<[^>]+>', '', d))
        y = int(m.group(0)) if m else None
        if ii.get('thumburl'):
            items.append((abs((y or 2100) - year - 0.5), y, ii['thumburl'], p['title']))
    items.sort()
    tiles = []
    for _, y, url, title in items[:6]:
        try:
            im = Image.open(io.BytesIO(get(url, raw=True))).convert('RGB')
        except Exception:
            continue
        im.thumbnail((300, 380)); t = Image.new('RGB', (300, 410), (30, 30, 30)); t.paste(im, ((300 - im.width) // 2, 0))
        ImageDraw.Draw(t).text((6, 388), f'{y or "?"} {title[5:40]}', fill=(255, 255, 0)); tiles.append(t)
    if not tiles:
        print(c['id'], 'no photos'); continue
    sheet = Image.new('RGB', (300 * len(tiles), 410), (0, 0, 0))
    for i, t in enumerate(tiles): sheet.paste(t, (300 * i, 0))
    sheet.save(f'{OUT}/{c["id"]}.jpg', quality=85)
    print(c['id'], 'season', year, 'photos', [(i[1]) for i in items[:6]])
