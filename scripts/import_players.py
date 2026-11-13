"""Import an edited player workbook back into src/data/players.ts.

    python3 scripts/import_players.py PackDraft38_Players.xlsx [--dry-run]

Checks every row first and lists problems by row number. Nothing is written
unless the whole sheet is valid.
"""
import json
import re
import subprocess
import sys
from collections import OrderedDict

from openpyxl import load_workbook

from pd38_schema import (TIERS, ARCHETYPES, CLUB_COLOUR_COLS, CLUB_ROWS, CLUBS, COL, ERAS, OVR_MAX, OVR_MIN, POSITION_GROUP, POSITIONS, ROOT, STAT_KEYS, STAT_MAX, STAT_MIN, TRAIT_COLS)

if len(sys.argv) < 2:
    raise SystemExit(__doc__)
SRC = sys.argv[1]
DRY = "--dry-run" in sys.argv
OUT = ROOT / "src/data/players.ts"

wb = load_workbook(SRC)  # inputs only; calculated columns are recomputed here
if "Players" not in wb.sheetnames:
    raise SystemExit("The workbook has no 'Players' tab.")
ws = wb["Players"]
header = [str(c.value).strip() if c.value is not None else "" for c in ws[1]]
col = {h: i for i, h in enumerate(header)}
missing = [h for h in COL if h not in col and "(auto)" not in h and h != "Card ID"]
if missing:
    raise SystemExit(f"Missing columns on the Players tab: {', '.join(missing)}")

errors: list[str] = []

# ── Clubs tab (kit colours). Optional: older workbooks don't have it.
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
clubs_new = None
FIELDS = ["primary", "secondary", "accent", "sleeve", "collar"]  # order used in CLUB_ROWS after code/name/short
old_clubs = {c[0]: c for c in CLUB_ROWS}
if "Clubs" in wb.sheetnames:
    clubs_new = []
    seen_codes = set()
    cws = wb["Clubs"]
    chead = {str(c.value).strip(): i for i, c in enumerate(cws[1]) if c.value}
    colour_idx = {}
    for label, field, aliases in CLUB_COLOUR_COLS:
        idx = next((chead[h] for h in [label, *aliases] if h in chead), None)
        colour_idx[field] = (label, idx)
    for r, row in enumerate(cws.iter_rows(min_row=2, values_only=True), start=2):
        code = str(row[chead.get("Code", 0)] or "").strip().upper()
        if not code:
            continue
        if not re.fullmatch(r"[A-Z]{3}", code):
            if any(v for v in row[1:6]):
                errors.append(f"Clubs row {r}: Code '{code}' must be three capital letters.")
            continue
        name = str(row[chead.get("Club Name", 1)] or "").strip()
        short = str(row[chead.get("Short", 2)] or "").strip() or code
        vals = {}
        for field, (label, idx) in colour_idx.items():
            if idx is None:  # column not in this (older) workbook: keep the current value
                prev = old_clubs.get(code)
                vals[field] = prev[3 + FIELDS.index(field)] if prev else vals.get("secondary", "#e2e8f0")
                continue
            v = str(row[idx] or "").strip()
            if not HEX.match(v):
                errors.append(f"Clubs row {r} ({code}): {label} '{v}' must be a hex colour like #DA291C.")
            vals[field] = v
        if not name:
            errors.append(f"Clubs row {r} ({code}): Club Name is empty.")
        if code in seen_codes:
            errors.append(f"Clubs row {r}: {code} appears twice.")
        seen_codes.add(code)
        clubs_new.append((code, name, short, *[vals[f].lower() for f in FIELDS]))
club_codes = {c[0] for c in clubs_new} if clubs_new else {c for c, _ in CLUBS}
cards = []


def text(row, h):
    v = row[col[h]]
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def number(row, h, lo, hi, r):
    v = row[col[h]]
    try:
        n = int(float(v))
        if float(v) != n:
            raise ValueError
    except (TypeError, ValueError):
        errors.append(f"Row {r}: {h} must be a whole number (got {v!r}).")
        return None
    if not lo <= n <= hi:
        errors.append(f"Row {r}: {h} must be {lo}–{hi} (got {n}).")
    return n


for r, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
    pid = text(row, "Player ID")
    if not pid:
        if any(text(row, h) for h in ("Full Name", "Season", "OVR")):
            errors.append(f"Row {r}: has data but no Player ID.")
        continue
    if not re.fullmatch(r"[a-z0-9]+(_[a-z0-9]+)+", pid):
        errors.append(f"Row {r}: Player ID '{pid}' should look like surname_firstname (lowercase letters/digits, underscores, no accents).")
    season = text(row, "Season")
    if not re.fullmatch(r"\d\d-\d\d", season):
        errors.append(f"Row {r}: Season must look like 08-09 (got '{season}'). In Excel, type it with a leading apostrophe if it turns into a date.")
    era = text(row, "Era Label").upper()
    if era not in ERAS:
        errors.append(f"Row {r}: Era Label '{era}' isn't allowed. Use one of: {', '.join(ERAS)}.")
    ovr = number(row, "OVR", OVR_MIN, OVR_MAX, r)
    positions = [p.strip().upper() for p in text(row, "Positions").replace(",", "/").split("/") if p.strip()]
    bad = [p for p in positions if p not in POSITIONS]
    if not positions or bad:
        errors.append(f"Row {r}: Positions '{text(row, 'Positions')}' must be codes like ST/LW. Unknown: {', '.join(bad) or '(empty)'}.")
    if len(set(positions)) != len(positions):
        errors.append(f"Row {r}: Positions lists the same position twice.")
    club = text(row, "Club").upper()
    if club not in club_codes:
        errors.append(f"Row {r}: Club '{club}' isn't a known code (see the Lists tab).")
    arch = text(row, "Archetype")
    if arch not in ARCHETYPES:
        errors.append(f"Row {r}: Archetype '{arch}' isn't allowed (see the Lists tab).")
    if positions and positions[0] == "GK" and arch not in ("Shot Stopper", "Sweeper Keeper"):
        errors.append(f"Row {r}: a goalkeeper's Archetype must be Shot Stopper or Sweeper Keeper.")
    stats = {k: number(row, h, STAT_MIN, STAT_MAX, r) for h, k in STAT_KEYS}
    traits = {}
    for h, k, allowed in TRAIT_COLS:
        v = text(row, h)
        if v not in allowed:
            errors.append(f"Row {r}: {h} '{v}' isn't allowed. Use one of: {', '.join(allowed)}.")
        traits[k] = v
    name, short, nation = text(row, "Full Name"), text(row, "Short Name"), text(row, "Nation")
    for h, v in (("Full Name", name), ("Short Name", short), ("Nation", nation)):
        if not v:
            errors.append(f"Row {r}: {h} is empty.")
    cards.append(dict(r=r, pid=pid, name=name, short=short, nation=nation, season=season, era=era, ovr=ovr, positions=positions, club=club, arch=arch, stats=stats, traits=traits))

# Cross-row checks
seen = {}
players: "OrderedDict[str, list]" = OrderedDict()
for c in cards:
    key = (c["pid"], c["season"])
    if key in seen:
        errors.append(f"Row {c['r']}: {c['pid']} {c['season']} duplicates row {seen[key]}. Each player can have only one card per season.")
    seen[key] = c["r"]
    players.setdefault(c["pid"], []).append(c)
for pid, cs in players.items():
    first = cs[0]
    for c in cs[1:]:
        for f, label in (("name", "Full Name"), ("short", "Short Name"), ("nation", "Nation")):
            if c[f] != first[f]:
                errors.append(f"Row {c['r']}: {label} '{c[f]}' differs from row {first['r']} ('{first[f]}') for the same Player ID {pid}.")

if not cards:
    errors.append("No cards found on the Players tab.")
if errors:
    print(f"Found {len(errors)} problem(s); nothing was changed:\n")
    print("\n".join(f"  • {e}" for e in errors))
    sys.exit(1)

def tier_of(ovr: int) -> str:
    return next(code for code, _, lo, hi in TIERS if lo <= ovr <= hi)


# Compare with the current database
before = {p["id"]: p for p in json.loads(subprocess.check_output(["node", "scripts/dump-players.mjs"], cwd=ROOT))}
after_ids = {f"{c['pid']}_{c['season'].replace('-', '')}": c for c in cards}
added = sorted(set(after_ids) - set(before))
removed = sorted(set(before) - set(after_ids))
changed = []
for cid, c in after_ids.items():
    b = before.get(cid)
    if not b:
        continue
    diffs = []
    if b["ovr"] != c["ovr"]:
        old_t, new_t = tier_of(b["ovr"]), tier_of(c["ovr"])
        diffs.append(f"OVR {b['ovr']}→{c['ovr']}" + (f" (tier {old_t}→{new_t})" if old_t != new_t else ""))
    for f, k in (("era", "era"), ("club", "club"), ("arch", "archetype"), ("nation", "nation"), ("name", "name"), ("short", "shortName")):
        if b[k] != c[f]:
            diffs.append(f"{k} {b[k]}→{c[f]}")
    if b["positions"] != c["positions"]:
        diffs.append(f"positions {'/'.join(b['positions'])}→{'/'.join(c['positions'])}")
    sd = [f"{k.upper()} {b['stats'][k]}→{c['stats'][k]}" for _, k in STAT_KEYS if b["stats"][k] != c["stats"][k]]
    td = [f"{k} {b['traits'][k]}→{c['traits'][k]}" for _, k, _ in TRAIT_COLS if b["traits"][k] != c["traits"][k]]
    diffs += sd + td
    if diffs:
        changed.append(f"{cid}: " + ", ".join(diffs))

# Write players.ts, grouped by the player's first card's position group
def ts(s: str) -> str:
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

GROUP_TITLE = {"GK": "Goalkeepers", "DEF": "Defenders", "MID": "Midfielders", "FWD": "Forwards"}
by_group = OrderedDict((g, []) for g in GROUP_TITLE)
for pid, cs in players.items():
    by_group[POSITION_GROUP[cs[0]["positions"][0]]].append((pid, cs))

lines = [
    "// Generated by scripts/import_players.py from the player spreadsheet. Edit the spreadsheet, not this file,",
    "// or keep both in step by re-exporting with scripts/export_players.py.",
    "import type { PlayerCard } from '../types/game';",
    "import { player } from './playerFactory';",
    "",
    "export const PLAYERS: PlayerCard[] = [",
]
for g, items in by_group.items():
    if not items:
        continue
    lines.append(f"  // ── {GROUP_TITLE[g]} ──")
    for pid, cs in items:
        base = cs[0]["traits"]
        trait_src = ", ".join(f"{k}: {ts(v)}" for k, v in base.items())
        lines.append(f"  ...player({ts(pid)}, {ts(cs[0]['name'])}, {ts(cs[0]['short'])}, {ts(cs[0]['nation'])},")
        lines.append(f"    {{ {trait_src} }},")
        lines.append("    [")
        for c in cs:
            st = ", ".join(str(c["stats"][k]) for _, k in STAT_KEYS)
            override = {k: v for k, v in c["traits"].items() if v != base[k]}
            ov = (", { " + ", ".join(f"{k}: {ts(v)}" for k, v in override.items()) + " }") if override else ""
            lines.append(f"      [{ts(c['season'])}, {ts(c['era'])}, {c['ovr']}, {ts('/'.join(c['positions']))}, {ts(c['club'])}, {ts(c['arch'])}, [{st}]{ov}],")
        lines.append("    ]),")
lines += ["];", "", "export const PLAYERS_BY_ID: Record<string, PlayerCard> = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));", ""]

print(f"{len(cards)} cards, {len(players)} players. {len(added)} added, {len(removed)} removed, {len(changed)} changed.")
for cid in added:
    print(f"  + {cid}")
for cid in removed:
    print(f"  - {cid}")
for c in changed:
    print(f"  ~ {c}")

club_changes = []
if clubs_new is not None:
    old = {c[0]: c for c in CLUB_ROWS}
    for c in clubs_new:
        o = old.get(c[0])
        if not o:
            club_changes.append(f"  + club {c[0]} {c[1]}")
        elif tuple(x.lower() for x in o[3:]) != c[3:] or o[1:3] != c[1:3]:
            diffs = [f"{lab} {a}→{b}" for lab, a, b in zip(("name", "short", "shirt", "secondary", "badge edge", "sleeves", "collar"), o[1:], c[1:]) if a.lower() != b.lower()]
            club_changes.append(f"  ~ club {c[0]}: " + ", ".join(diffs))
    for code in old:
        if code not in club_codes:
            club_changes.append(f"  - club {code} (no longer listed)")
    used = {c["club"] for c in cards}
    missing = sorted(used - club_codes)
    if missing:
        print(f"Clubs used by cards but missing from the Clubs tab: {', '.join(missing)}. Nothing was changed.")
        sys.exit(1)
print(f"{len(club_changes)} club colour change(s).")
for c in club_changes:
    print(c)

if DRY:
    print("\nDry run: nothing written.")
else:
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)}")
    if clubs_new is not None and club_changes:
        clubs_ts = ROOT / "src/data/clubs.ts"
        src = clubs_ts.read_text(encoding="utf-8")
        body = "\n".join(
            f"  {{ code: {ts(c[0])}, name: {ts(c[1])}, short: {ts(c[2])}, primary: {ts(c[3])}, secondary: {ts(c[4])}, accent: {ts(c[5])}, sleeve: {ts(c[6])}, collar: {ts(c[7])} }},"
            for c in clubs_new
        )
        src = re.sub(r"(const list: Club\[\] = \[\n)(.*?)(\n\];)", lambda m: m.group(1) + body + m.group(3), src, flags=re.S)
        clubs_ts.write_text(src, encoding="utf-8")
        print(f"Wrote {clubs_ts.relative_to(ROOT)}")
