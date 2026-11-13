"""Export src/data/players.ts to an editable Excel workbook.

    python3 scripts/export_players.py [output.xlsx]

Edit the workbook, then turn it back into game data with scripts/import_players.py.
"""
import json
import subprocess
import sys

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

from pd38_schema import (ACCESSORIES, ARCHETYPES, CLUB_HEADERS, CLUB_ROWS, CLUBS, COL, ERAS, EXPRESSIONS, FACIAL_HAIR, HAIR_COLOURS, HAIR_STYLES, HEAD_SHAPES, HEADERS,
                         OVR_MAX, OVR_MIN, POSITION_GROUP, POSITIONS, ROOT, SKIN, STAT_KEYS, STAT_MAX, STAT_MIN, TIERS, TRAIT_COLS)

OUT = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "PackDraft38_Players.xlsx")
players = json.loads(subprocess.check_output(["node", "scripts/dump-players.mjs"], cwd=ROOT))
LAST_ROW = len(players) + 200  # formulas and dropdowns reach this far so new rows work too

FONT = "Arial"
f_body = Font(name=FONT, size=10)
f_input = Font(name=FONT, size=10, color="0000FF")  # blue = editable input
f_auto = Font(name=FONT, size=10, color="000000", italic=True)
f_head = Font(name=FONT, size=10, bold=True, color="FFFFFF")
fill_head = PatternFill("solid", fgColor="0F3D24")
fill_head_auto = PatternFill("solid", fgColor="4B5563")
fill_auto = PatternFill("solid", fgColor="EEF0F2")
fill_key = PatternFill("solid", fgColor="FFF2CC")
thin = Side(style="thin", color="D1D5DB")
border = Border(bottom=thin)

wb = Workbook()

# ───────────────────────── Guide ─────────────────────────
g = wb.active
g.title = "Guide"
guide = [
    ("PackDraft 38 · Player Database", "title"),
    (f"{len(players)} cards across {len({p['basePlayerId'] for p in players})} players. One row = one card (one era of one player).", ""),
    ("", ""),
    ("WHAT TO EDIT", "h"),
    ("Blue text on the Players tab = editable. Grey italic columns are calculated: don't type in them.", ""),
    ("OVR: 74 to 96. This sets the card's rarity tier (see Tier rules below).", ""),
    ("Era Label: the badge text on the card (e.g. PRIME, LEGEND). Pick from the dropdown.", ""),
    ("Positions: primary first, extras after a slash, e.g. ST/LW or CB/RB. Valid codes are on the Lists tab.", ""),
    ("Club: three-letter code from the dropdown (names on the Lists tab). It sets kit colours and club chemistry.", ""),
    ("Archetype: from the dropdown. Managers' bonuses look for specific archetypes.", ""),
    (f"PAC to PHY: {STAT_MIN} to {STAT_MAX}. For goalkeepers they mean DIV, HAN, KIC, REF, SPD, POS.", ""),
    ("Look columns (Skin Tone to Accessory): change the caricature. Pick from the dropdowns.", ""),
    ("", ""),
    ("TIER RULES (card type)", "h"),
]
for code, name, lo, hi in TIERS:
    guide.append((f"{name} ({code}): OVR {lo}–{hi}", ""))
guide += [
    ("To move a card to a different tier, change its OVR. The Tier column updates automatically.", ""),
    ("Drop rates: Squad 63.5% · Cult Hero 15% · Veteran 11% · World Class 8.5% · Prime 2% (4% in pack 11).", ""),
    ("", ""),
    ("ADDING, REMOVING, RENAMING", "h"),
    ("Add a card: copy an existing row to a new row at the bottom, then edit it. Keep the formulas in the grey columns.", ""),
    ("New era of an existing player: reuse their Player ID with a different Season (YY-YY, e.g. 06-07).", ""),
    ("New player: invent a Player ID as surname_firstname, lowercase, no accents (e.g. scholes_paul).", ""),
    ("Remove a card: delete its whole row.", ""),
    ("Don't change a Player ID unless you mean it: it links a player's eras together (one per squad, one per pack).", ""),
    ("", ""),
    ("SENDING IT BACK", "h"),
    ("Save as .xlsx (Excel, or Google Sheets → File → Download → Microsoft Excel) and send it back.", ""),
    ("The import checks every row and lists any problems by row number before anything changes in the game.", ""),
    ("", ""),
    ("The Summary tab counts cards per tier and position, so you can keep every tier stocked for every position.", ""),
    ("", ""),
    ("KIT COLOURS", "h"),
    ("Clubs tab: Shirt, Sleeves, Collar, Secondary and Badge Edge take hex colour codes like #DA291C. Every card for that club updates.", ""),
]
for i, (text, kind) in enumerate(guide, start=1):
    c = g.cell(row=i, column=1, value=text)
    c.font = Font(name=FONT, size=16, bold=True) if kind == "title" else Font(name=FONT, size=11, bold=True, color="0F3D24") if kind == "h" else f_body
g.column_dimensions["A"].width = 120

# ───────────────────────── Lists ─────────────────────────
ls = wb.create_sheet("Lists")
lists = [
    ("Era Label", ERAS),
    ("Archetype", ARCHETYPES),
    ("Club Code", [c for c, _ in CLUBS]),
    ("Club Name", [n for _, n in CLUBS]),
    ("Position", POSITIONS),
    ("Position Group", [POSITION_GROUP[p] for p in POSITIONS]),
    ("Skin Tone", SKIN),
    ("Hair Style", HAIR_STYLES),
    ("Hair Colour", HAIR_COLOURS),
    ("Facial Hair", FACIAL_HAIR),
    ("Head Shape", HEAD_SHAPES),
    ("Expression", EXPRESSIONS),
    ("Accessory", ACCESSORIES),
    ("Tier", [t[0] for t in TIERS]),
    ("Tier Name", [t[1] for t in TIERS]),
    ("Tier Min OVR", [t[2] for t in TIERS]),
]
list_range = {}
for ci, (head, values) in enumerate(lists, start=1):
    h = ls.cell(row=1, column=ci, value=head)
    h.font, h.fill = f_head, fill_head
    for ri, v in enumerate(values, start=2):
        ls.cell(row=ri, column=ci, value=v).font = f_body
    list_range[head] = f"Lists!${L(ci)}$2:${L(ci)}${len(values) + 1}"
    ls.column_dimensions[L(ci)].width = max(12, len(head) + 4, *(len(str(v)) + 2 for v in values))
ls.freeze_panes = "A2"
ls.cell(row=1, column=len(lists) + 2, value="Allowed values come from the game code. Tier Min OVR mirrors src/data/playerFactory.ts.").font = Font(name=FONT, size=9, italic=True)

# ───────────────────────── Players ─────────────────────────
ws = wb.create_sheet("Players", 1)
auto_cols = {"Card ID", "Tier (auto)", "Primary Pos (auto)", "Group (auto)"}
for h, ci in COL.items():
    c = ws.cell(row=1, column=ci, value=h)
    c.font = f_head
    c.fill = fill_head_auto if h in auto_cols else fill_head
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
ws.row_dimensions[1].height = 30

tier_list, tier_min = list_range["Tier"], list_range["Tier Min OVR"]
pos_list, grp_list = list_range["Position"], list_range["Position Group"]


def put_formulas(r: int):
    B, F, H, J, Z = (f"{L(COL[x])}{r}" for x in ("Player ID", "Season", "OVR", "Positions", "Primary Pos (auto)"))
    ws.cell(row=r, column=COL["Card ID"], value=f'=IF({B}="","",{B}&"_"&SUBSTITUTE({F},"-",""))')
    ws.cell(row=r, column=COL["Tier (auto)"], value=f'=IF({H}="","",IFERROR(INDEX({tier_list},MATCH({H},{tier_min},1)),"OVR too low"))')
    ws.cell(row=r, column=COL["Primary Pos (auto)"], value=f'=IF({J}="","",LEFT({J},FIND("/",{J}&"/")-1))')
    ws.cell(row=r, column=COL["Group (auto)"], value=f'=IF({Z}="","",IFERROR(INDEX({grp_list},MATCH({Z},{pos_list},0)),"Bad position"))')
    for h in auto_cols:
        cell = ws.cell(row=r, column=COL[h])
        cell.font, cell.fill = f_auto, fill_auto


for r, p in enumerate(players, start=2):
    values = {
        "Player ID": p["basePlayerId"], "Full Name": p["name"], "Short Name": p["shortName"], "Nation": p["nation"],
        "Season": p["season"], "Era Label": p["era"], "OVR": p["ovr"], "Positions": "/".join(p["positions"]),
        "Club": p["club"], "Archetype": p["archetype"],
        **{h: p["stats"][k] for h, k in STAT_KEYS},
        **{h: p["traits"][k] for h, k, _ in TRAIT_COLS},
    }
    for h, v in values.items():
        c = ws.cell(row=r, column=COL[h], value=v)
        c.font = f_input
        c.border = border
        if h == "Season":
            c.number_format = "@"  # keep "08-09" as text
    put_formulas(r)
for r in range(len(players) + 2, LAST_ROW + 1):
    put_formulas(r)
    ws.cell(row=r, column=COL["Season"]).number_format = "@"

# Column widths
widths = {"Card ID": 24, "Player ID": 22, "Full Name": 24, "Short Name": 16, "Nation": 18, "Season": 9, "Era Label": 13, "OVR": 7, "Tier (auto)": 16,
          "Positions": 12, "Club": 8, "Archetype": 21, "Primary Pos (auto)": 11, "Group (auto)": 9}
for h, ci in COL.items():
    ws.column_dimensions[L(ci)].width = widths.get(h, 7 if h in dict(STAT_KEYS) else 13)
ws.freeze_panes = ws.cell(row=2, column=COL["Short Name"] + 0)  # keep IDs and names visible while scrolling
ws.auto_filter.ref = f"A1:{L(len(HEADERS))}{len(players) + 1}"

# Dropdowns and number checks on every editable row
LIST_VALUES = dict(lists)  # header -> allowed values (from the game code)


def dv_list(header, rng, prompt, values=None):
    # Short lists go inline ("a,b,c"), which every spreadsheet app shows as a dropdown.
    # Longer ones point at the Lists tab. The reference must NOT start with "=":
    # Excel and Google Sheets silently drop dropdowns written that way.
    values = values or []
    inline = '"' + ",".join(str(v) for v in values) + '"'
    formula = inline if values and len(inline) <= 255 else rng
    dv = DataValidation(type="list", formula1=formula, allow_blank=True, showErrorMessage=True, errorTitle="Not allowed", error=f"Pick a value from the {header} list.", promptTitle=header, prompt=prompt, showInputMessage=True)
    col = L(COL[header])
    dv.add(f"{col}2:{col}{LAST_ROW}")
    ws.add_data_validation(dv)


dv_list("Era Label", list_range["Era Label"], "Badge text on the card.", LIST_VALUES["Era Label"])
dv_list("Club", list_range["Club Code"], "Three-letter club code (names on the Lists tab).")
dv_list("Archetype", list_range["Archetype"], "Playing style. Managers' bonuses check archetypes.", LIST_VALUES["Archetype"])
for h, _, allowed in TRAIT_COLS:
    dv_list(h, list_range[h], "Caricature look: pick from the list.", allowed)

ovr = DataValidation(type="whole", operator="between", formula1=str(OVR_MIN), formula2=str(OVR_MAX), showErrorMessage=True, errorTitle="OVR out of range",
                     error=f"OVR must be a whole number from {OVR_MIN} to {OVR_MAX}.", promptTitle="OVR", prompt="74–80 Squad · 81–85 Cult · 86–90 World Class · 91–96 Prime", showInputMessage=True)
ovr.add(f"{L(COL['OVR'])}2:{L(COL['OVR'])}{LAST_ROW}")
ws.add_data_validation(ovr)
stat = DataValidation(type="whole", operator="between", formula1=str(STAT_MIN), formula2=str(STAT_MAX), showErrorMessage=True, errorTitle="Stat out of range", error=f"Stats must be whole numbers from {STAT_MIN} to {STAT_MAX}.")
stat.add(f"{L(COL['PAC'])}2:{L(COL['PHY'])}{LAST_ROW}")
ws.add_data_validation(stat)
posv = DataValidation(type="custom", formula1="TRUE", showInputMessage=True, promptTitle="Positions", prompt="Primary first, then extras: ST/LW, CB/RB. Codes: " + ", ".join(POSITIONS))
posv.add(f"{L(COL['Positions'])}2:{L(COL['Positions'])}{LAST_ROW}")
ws.add_data_validation(posv)

# Tier colours (cards' own palette)
tcol = L(COL["Tier (auto)"])
for code, colour, fg in [("PRIME_ICON", "F8FAFC", "0F172A"), ("RISING_WORLD", "F59E0B", "000000"), ("VETERAN", "7C3AED", "FFFFFF"), ("CULT_HERO", "DC2626", "FFFFFF"), ("STANDARD", "374151", "FFFFFF")]:
    ws.conditional_formatting.add(f"{tcol}2:{tcol}{LAST_ROW}", FormulaRule(formula=[f'${tcol}2="{code}"'], fill=PatternFill("solid", fgColor=colour), font=Font(name=FONT, color=fg, bold=True)))

ws.cell(row=1, column=COL["Card ID"]).comment = Comment("Calculated from Player ID + Season. This is the card's unique ID in the game.", "PackDraft 38")
ws.cell(row=1, column=COL["Player ID"]).comment = Comment("Shared by all eras of the same player. Drafting one era removes the others from the pool.", "PackDraft 38")
ws.cell(row=1, column=COL["OVR"]).comment = Comment(f"{OVR_MIN}–{OVR_MAX}. Sets the tier (rarity) automatically.", "PackDraft 38")

# ───────────────────────── Clubs (kit colours) ─────────────────────────
cs = wb.create_sheet("Clubs", 2)
for ci, h in enumerate(CLUB_HEADERS, start=1):
    c = cs.cell(row=1, column=ci, value=h)
    c.font, c.fill = f_head, fill_head
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
cs.row_dimensions[1].height = 30
for r, (code, name, short, prim, sec, acc, slv, col) in enumerate(CLUB_ROWS, start=2):
    cs.cell(row=r, column=1, value=code).font = Font(name=FONT, size=10, bold=True)
    for ci, v in enumerate([name, short, prim, slv, col, sec, acc], start=2):
        cs.cell(row=r, column=ci, value=v).font = f_input
    sw = cs.cell(row=r, column=9, value="collar")
    sw.fill = PatternFill("solid", fgColor=prim.lstrip("#").upper())
    sw.font = Font(name=FONT, size=9, bold=True, color=col.lstrip("#").upper())
    sw.alignment = Alignment(horizontal="center")
last = len(CLUB_ROWS) + 60
hexv = DataValidation(type="custom", formula1='AND(LEN(D2)=7,LEFT(D2,1)="#")', showErrorMessage=True, errorTitle="Colour code", error="Use a 6-digit hex colour like #DA291C.", showInputMessage=True, promptTitle="Colour", prompt="Hex colour, e.g. #DA291C. Search 'colour picker' to find codes.")
hexv.add(f"D2:H{last}")
cs.add_data_validation(hexv)
for col, w in zip("ABCDEFGHI", [8, 26, 8, 11, 11, 11, 12, 12, 12]):
    cs.column_dimensions[col].width = w
cs.freeze_panes = "B2"
notes = [
    "Shirt: main shirt colour. Sleeves and Collar: the portrait's sleeves and collar (set Sleeves = Shirt for a solid shirt).",
    "Secondary: the card's diagonal stripe, the club badge text and the league-table chip. Badge Edge: outline on the club badge.",
    "Preview shows the shirt with the collar colour as exported; it doesn't update as you type.",
]
for k, t in enumerate(notes):
    cs.cell(row=len(CLUB_ROWS) + 3 + k, column=1, value=t).font = Font(name=FONT, size=9, italic=True)

# ───────────────────────── Summary ─────────────────────────
sm = wb.create_sheet("Summary", 2)
sm["A1"] = "Cards per tier and position group"
sm["A1"].font = Font(name=FONT, size=14, bold=True)
sm["A2"] = "Updates as you edit the Players tab. Every tier should have cards in every group so packs never run dry."
sm["A2"].font = Font(name=FONT, size=9, italic=True)
groups = ["GK", "DEF", "MID", "FWD"]
for ci, h in enumerate(["Tier", "Name"] + groups + ["Total"], start=1):
    c = sm.cell(row=4, column=ci, value=h)
    c.font, c.fill = f_head, fill_head
tierC, grpC = L(COL["Tier (auto)"]), L(COL["Group (auto)"])
for ri, (code, name, _, _) in enumerate(TIERS, start=5):
    sm.cell(row=ri, column=1, value=code).font = f_body
    sm.cell(row=ri, column=2, value=name).font = f_body
    for gi, grp in enumerate(groups, start=3):
        sm.cell(row=ri, column=gi, value=f'=COUNTIFS(Players!${tierC}$2:${tierC}${LAST_ROW},$A{ri},Players!${grpC}$2:${grpC}${LAST_ROW},{L(gi)}$4)').font = f_body
    sm.cell(row=ri, column=7, value=f"=SUM(C{ri}:F{ri})").font = Font(name=FONT, size=10, bold=True)
tr = 5 + len(TIERS)
sm.cell(row=tr, column=1, value="Total").font = Font(name=FONT, size=10, bold=True)
for ci in range(3, 8):
    sm.cell(row=tr, column=ci, value=f"=SUM({L(ci)}5:{L(ci)}{tr - 1})").font = Font(name=FONT, size=10, bold=True)
pid = L(COL["Player ID"])
sm.cell(row=tr + 2, column=1, value="Distinct players").font = f_body
sm.cell(row=tr + 2, column=3, value=f'=SUMPRODUCT((Players!${pid}$2:${pid}${LAST_ROW}<>"")/COUNTIF(Players!${pid}$2:${pid}${LAST_ROW},Players!${pid}$2:${pid}${LAST_ROW}&""))').font = f_body
sm.cell(row=tr + 2, column=3).number_format = "0"
sm.cell(row=tr + 3, column=1, value="Cards with a problem (OVR or position)").font = f_body
sm.cell(row=tr + 3, column=3, value=f'=COUNTIF(Players!${tierC}$2:${tierC}${LAST_ROW},"OVR too low")+COUNTIF(Players!${grpC}$2:${grpC}${LAST_ROW},"Bad position")').font = f_body
for ci, w in zip("ABCDEFG", [16, 26, 8, 8, 8, 8, 9]):
    sm.column_dimensions[ci].width = w
for row in sm.iter_rows(min_row=5, max_row=tr, min_col=3, max_col=7):
    for c in row:
        c.alignment = Alignment(horizontal="center")

wb.save(OUT)
print(f"Wrote {OUT} ({len(players)} cards)")
