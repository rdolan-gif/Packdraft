"""Shared definitions for the PackDraft 38 player spreadsheet (export + import).

Allowed values are read from the game's own TypeScript, so the spreadsheet's
dropdowns and the import checks always match what the game accepts.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES = (ROOT / "src/types/game.ts").read_text(encoding="utf-8")
CLUBS_TS = (ROOT / "src/data/clubs.ts").read_text(encoding="utf-8")


def union(name: str) -> list[str]:
    m = re.search(rf"export type {name}\s*=([^;]+);", TYPES)
    if not m:
        raise SystemExit(f"Could not find type {name} in src/types/game.ts")
    return re.findall(r"'([^']+)'", m.group(1))


POSITIONS = union("Position")
ERAS = union("EraLabel")
ARCHETYPES = union("Archetype")
SKIN = union("SkinTone")
HAIR_STYLES = union("HairStyle")
HAIR_COLOURS = union("HairColor")
FACIAL_HAIR = union("FacialHair")
HEAD_SHAPES = union("HeadShape")
EXPRESSIONS = union("Expression")
ACCESSORIES = union("Accessory")
CLUBS = re.findall(r"code: '([A-Z]{3})', name: '([^']+)'", CLUBS_TS)  # [(code, name)]
# Full rows: code, name, short, primary (shirt), secondary (stripe/badge text/table), accent (badge outline), sleeve, collar
CLUB_ROWS = re.findall(
    r"\{ code: '([A-Z]{3})', name: '([^']+)', short: '([^']+)', primary: '(#[0-9a-fA-F]{6})', secondary: '(#[0-9a-fA-F]{6})', accent: '(#[0-9a-fA-F]{6})', sleeve: '(#[0-9a-fA-F]{6})', collar: '(#[0-9a-fA-F]{6})' \}",
    CLUBS_TS,
)
CLUB_HEADERS = ["Code", "Club Name", "Short", "Shirt", "Sleeves", "Collar", "Secondary", "Badge Edge", "Preview"]
# Spreadsheet colour columns → clubs.ts fields (older workbooks used the names on the right)
CLUB_COLOUR_COLS = [("Shirt", "primary", ["Shirt (primary)"]), ("Sleeves", "sleeve", []), ("Collar", "collar", []),
                    ("Secondary", "secondary", ["Trim (secondary)"]), ("Badge Edge", "accent", ["Badge Edge (accent)"])]

POSITION_GROUP = {p: ("GK" if p == "GK" else "DEF" if p in ("RB", "CB", "LB") else "FWD" if p in ("RW", "LW", "ST") else "MID") for p in POSITIONS}

# (header, json path, kind, allowed list or None)
# kind: key = identity column, text, int, list (dropdown), formula (auto)
STAT_KEYS = [("PAC", "pac"), ("SHO", "sho"), ("PAS", "pas"), ("DRI", "dri"), ("DEF", "def"), ("PHY", "phy")]
TRAIT_COLS = [
    ("Skin Tone", "skinTone", SKIN),
    ("Hair Style", "hairStyle", HAIR_STYLES),
    ("Hair Colour", "hairColor", HAIR_COLOURS),
    ("Facial Hair", "facialHair", FACIAL_HAIR),
    ("Head Shape", "headShape", HEAD_SHAPES),
    ("Expression", "expression", EXPRESSIONS),
    ("Accessory", "accessory", ACCESSORIES),
]

HEADERS = (
    ["Card ID", "Player ID", "Full Name", "Short Name", "Nation", "Season", "Era Label", "OVR", "Tier (auto)", "Positions", "Club", "Archetype"]
    + [h for h, _ in STAT_KEYS]
    + [h for h, _, _ in TRAIT_COLS]
    + ["Primary Pos (auto)", "Group (auto)"]
)
COL = {h: i + 1 for i, h in enumerate(HEADERS)}  # 1-based column numbers

OVR_MIN, OVR_MAX = 74, 96
STAT_MIN, STAT_MAX = 30, 99
TIERS = [("STANDARD", "Squad Regular", 74, 80), ("CULT_HERO", "Cult Hero", 81, 83), ("VETERAN", "Veteran", 84, 85), ("RISING_WORLD", "Rising Star / World Class", 86, 90), ("PRIME_ICON", "Prime Icon", 91, 96)]
