import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { FORMATIONS } from '../data/formations';
import { getClub } from '../data/clubs';
import { collarForSeason } from '../data/kits';
import { devTheme } from '../data/devThemes';
import { MANAGERS_BY_ID } from '../data/managers';
import { gradeLabel, ordinal } from '../engine/seasonSimulator';
import type { FormationId, Grade, Lineup, ManagerId, PlayerCard, SeasonSummary, TeamRating } from '../types/game';
import { PlayerCaricature } from './PlayerCaricature';

// The downloadable season card: a 1080 x 1350 PNG (Instagram portrait size) drawn on a canvas.
// Text is drawn with the page's own fonts; portraits are the game's SVG drawings, rendered to images.

export interface SeasonCardData {
  summary: SeasonSummary;
  teamName: string;
  formationId: FormationId;
  lineup: Lineup;
  managerId: ManagerId;
  rating: TeamRating;
  dailyNumber?: number;
}

const W = 1080;
const H = 1350;
const DISPLAY = '"Bebas Neue", Impact, sans-serif';
const BODY = 'Inter, Arial, sans-serif';

export const GRADE_HEX: Record<Grade, [string, string]> = {
  'S+': ['#fde68a', '#f472b6'],
  S: ['#fde047', '#d97706'],
  A: ['#34d399', '#047857'],
  B: ['#38bdf8', '#1d4ed8'],
  C: ['#e2e8f0', '#64748b'],
  D: ['#fbbf24', '#c2410c'],
  F: ['#fb7185', '#9f1239'],
};

/** Render one player's portrait to an image the canvas can draw. */
function portraitImage(card: PlayerCard): Promise<HTMLImageElement> {
  const theme = card.tier === 'SECRET_DEV' ? devTheme(card.basePlayerId) : undefined;
  const kit = getClub(theme ? theme.fanClub : card.club);
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <PlayerCaricature
        traits={card.traits}
        kitPrimaryColor={kit.primary}
        kitSecondaryColor={kit.secondary}
        kitSleeveColor={kit.sleeve}
        kitCollarColor={kit.collar}
        collarStyle={collarForSeason(card.season)}
        seed={card.id}
        size={200}
      />,
    ),
  );
  let svg = host.innerHTML;
  root.unmount();
  if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrink the font until the text fits the width. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, family: string, weight = '') {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxW) break;
    s -= 2;
  } while (s > 12);
  return s;
}

/** Word-wrap into at most maxLines lines (the last one gets an ellipsis if cut). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxW) {
      line = test;
      continue;
    }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines) {
      let last = lines[maxLines - 1];
      while (ctx.measureText(`${last}…`).width > maxW && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
      lines[maxLines - 1] = `${last}…`;
      return lines;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawSeasonCard(d: SeasonCardData): Promise<HTMLCanvasElement> {
  const { summary: s, lineup, formationId, rating } = d;
  const r = s.record;
  const [g1, g2] = GRADE_HEX[s.grade];
  const info = gradeLabel(s.grade, s.position);
  const manager = MANAGERS_BY_ID[d.managerId];

  await Promise.all([document.fonts?.load(`80px ${DISPLAY}`), document.fonts?.load(`700 30px ${BODY}`), document.fonts?.load(`400 30px ${BODY}`)]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1f14');
  bg.addColorStop(0.55, '#06120b');
  bg.addColorStop(1, '#020604');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(170, 250, 10, 170, 250, 520);
  glow.addColorStop(0, `${g1}40`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // frame
  ctx.lineWidth = 6;
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, g1);
  frame.addColorStop(1, g2);
  ctx.strokeStyle = frame;
  roundRect(ctx, 14, 14, W - 28, H - 28, 36);
  ctx.stroke();

  // ── header
  ctx.textBaseline = 'alphabetic';
  ctx.font = `60px ${DISPLAY}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('PACK', 60, 102);
  let x = 60 + ctx.measureText('PACK').width;
  ctx.fillStyle = '#34d399';
  ctx.fillText('DRAFT', x, 102);
  x += ctx.measureText('DRAFT ').width;
  ctx.fillStyle = '#fde047';
  ctx.fillText('38', x, 102);
  const chip = d.dailyNumber ? `DAILY DRAFT #${d.dailyNumber}` : 'SEASON CARD';
  ctx.font = `800 24px ${BODY}`;
  const cw = ctx.measureText(chip).width + 36;
  ctx.fillStyle = d.dailyNumber ? '#38bdf8' : 'rgba(255,255,255,.12)';
  roundRect(ctx, W - 60 - cw, 58, cw, 52, 26);
  ctx.fill();
  ctx.fillStyle = d.dailyNumber ? '#000' : '#fff';
  ctx.fillText(chip, W - 60 - cw + 18, 93);

  // ── grade stamp + team
  const cx = 160;
  const cy = 260;
  const stamp = ctx.createLinearGradient(cx - 95, cy - 95, cx + 95, cy + 95);
  stamp.addColorStop(0, g1);
  stamp.addColorStop(1, g2);
  ctx.fillStyle = stamp;
  ctx.beginPath();
  ctx.arc(cx, cy, 95, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.stroke();
  ctx.fillStyle = s.grade === 'C' || s.grade === 'S' || s.grade === 'S+' || s.grade === 'D' ? '#111' : '#fff';
  ctx.font = `${s.grade.length > 1 ? 104 : 130}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText(s.grade, cx, cy + (s.grade.length > 1 ? 38 : 46));
  ctx.textAlign = 'left';

  const tx = 290;
  const team = d.teamName.toUpperCase();
  fitText(ctx, team, W - tx - 60, 92, DISPLAY);
  ctx.fillStyle = '#fff';
  ctx.fillText(team, tx, 240);
  ctx.font = `56px ${DISPLAY}`;
  ctx.fillStyle = g1;
  ctx.fillText(info.title, tx, 300);
  ctx.font = `600 28px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText(`${ordinal(s.position)} · ${r.points} pts${s.eraName ? ` · ${s.eraName}` : ''}`, tx, 345);

  // ── stat boxes
  const stats: [string, string][] = [
    ['RECORD', `${r.won}-${r.drawn}-${r.lost}`],
    ['POINTS', `${r.points}`],
    ['SCORED', `${r.gf}`],
    ['CONCEDED', `${r.ga}`],
    ['GOAL DIFF', `${r.gf - r.ga >= 0 ? '+' : ''}${r.gf - r.ga}`],
  ];
  const bw = (W - 120 - 4 * 16) / 5;
  stats.forEach(([k, v], i) => {
    const bx = 60 + i * (bw + 16);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    roundRect(ctx, bx, 395, bw, 120, 20);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = `800 18px ${BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillText(k, bx + bw / 2, 432);
    fitText(ctx, v, bw - 20, 62, DISPLAY);
    ctx.fillStyle = '#fff';
    ctx.fillText(v, bx + bw / 2, 495);
    ctx.textAlign = 'left';
  });

  // ── pitch with the XI
  const px = 60;
  const py = 535;
  const pw = 560;
  const ph = 495;
  const pitch = ctx.createLinearGradient(0, py, 0, py + ph);
  pitch.addColorStop(0, '#166534');
  pitch.addColorStop(1, '#14532d');
  ctx.fillStyle = pitch;
  roundRect(ctx, px, py, pw, ph, 24);
  ctx.fill();
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 24);
  ctx.clip();
  for (let i = 0; i < 8; i++) {
    if (i % 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillRect(px, py + (i * ph) / 8, pw, ph / 8);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 20, py + 20, pw - 40, ph - 40);
  ctx.beginPath();
  ctx.moveTo(px + 20, py + ph / 2);
  ctx.lineTo(px + pw - 20, py + ph / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(px + pw / 2 - 110, py + ph - 20 - 80, 220, 80);
  ctx.strokeRect(px + pw / 2 - 110, py + 20, 220, 80);
  ctx.restore();

  const slots = FORMATIONS[formationId].slots;
  const placed = slots.map((sl) => ({ sl, card: lineup[sl.id] })).filter((p): p is { sl: (typeof slots)[number]; card: PlayerCard } => !!p.card);
  const faces = await Promise.all(placed.map((p) => portraitImage(p.card).catch(() => null)));
  // Group the formation into rows (forwards, midfield, defence, keeper) and spread them evenly down the
  // pitch so tokens never overlap. Wide players sit a little higher, for a sense of shape.
  const ys = [...new Set(placed.map((p) => p.sl.y))].sort((a, b) => a - b);
  const rowOf = new Map<number, number>();
  let row = -1;
  let last = -99;
  ys.forEach((y) => {
    if (y - last > 8) row++;
    rowOf.set(y, row);
    last = y;
  });
  const rowCount = row + 1;
  const rowGap = (ph - 150) / Math.max(1, rowCount - 1);
  placed.forEach(({ sl, card }, i) => {
    const wide = sl.x < 22 || sl.x > 78;
    const fx = px + 55 + (sl.x / 100) * (pw - 110);
    const fy = py + 75 + rowOf.get(sl.y)! * rowGap - (wide && sl.label !== 'GK' ? 14 : 0);
    const img = faces[i];
    if (img) ctx.drawImage(img, fx - 33, fy - 50, 66, 73);
    const name = card.shortName.toUpperCase();
    ctx.font = `24px ${DISPLAY}`;
    const label = `${card.ovr} ${name}`;
    const lw = Math.min(124, ctx.measureText(label).width + 18);
    ctx.fillStyle = card.tier === 'PRIME_ICON' ? '#f8fafc' : card.tier === 'RISING_WORLD' ? '#facc15' : card.tier === 'SECRET_DEV' ? '#a855f7' : 'rgba(0,0,0,.75)';
    roundRect(ctx, fx - lw / 2, fy + 20, lw, 28, 8);
    ctx.fill();
    ctx.fillStyle = card.tier === 'PRIME_ICON' || card.tier === 'RISING_WORLD' ? '#111' : '#fff';
    ctx.textAlign = 'center';
    fitText(ctx, label, lw - 12, 24, DISPLAY);
    ctx.fillText(label, fx, fy + 42);
    ctx.textAlign = 'left';
  });

  // ── right column: the season's honours
  const rx = 650;
  const rw = W - 60 - rx;
  const rows: [string, string, string][] = [];
  if (s.mvp) rows.push(['🏅', 'CLUB MVP', `${s.mvp.name} · ${(s.mvp.ratingSum / Math.max(1, s.mvp.apps)).toFixed(2)} avg`]);
  if (s.userTopScorer) rows.push(['⚽', s.userWonBoot ? 'GOLDEN BOOT' : 'TOP SCORER', `${s.userTopScorer.name} · ${s.userTopScorer.goals} goals`]);
  if (s.userTopCreator) rows.push(['🎯', s.userWonPlaymaker ? 'PLAYMAKER AWARD' : 'TOP CREATOR', `${s.userTopCreator.name} · ${s.userTopCreator.assists} assists`]);
  if (s.userKeeper) rows.push(['🧤', s.userWonGlove ? 'GOLDEN GLOVE' : 'CLEAN SHEETS', `${s.userKeeper.name} · ${s.userKeeper.cleanSheets}`]);
  rows.push(['📋', 'SQUAD', `${rating.overall.toFixed(1)} rated · ${rating.chemistry} chem · ${formationId}`]);
  rows.push([manager.emoji, 'MANAGER', manager.name]);
  const rh = 74;
  const gap = (ph - rows.length * rh) / Math.max(1, rows.length - 1);
  rows.slice(0, 6).forEach(([emoji, label, value], i) => {
    const ry = py + i * (rh + Math.min(14, gap));
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    roundRect(ctx, rx, ry, rw, rh, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `34px ${BODY}`;
    ctx.fillText(emoji, rx + 18, ry + 50);
    ctx.font = `800 17px ${BODY}`;
    ctx.fillStyle = g1;
    ctx.fillText(label, rx + 76, ry + 30);
    ctx.fillStyle = '#fff';
    fitText(ctx, value, rw - 96, 26, BODY, '700');
    ctx.fillText(value, rx + 76, ry + 60);
  });

  // ── form guide: 38 squares
  const form = s.form ?? '';
  const fy = py + ph + 36;
  ctx.font = `800 18px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillText('FORM GUIDE · MATCHWEEK 1 → 38', 60, fy);
  const sq = (W - 120 - 37 * 4) / 38;
  [...form].forEach((c, i) => {
    ctx.fillStyle = c === 'W' ? '#22c55e' : c === 'D' ? '#eab308' : '#ef4444';
    roundRect(ctx, 60 + i * (sq + 4), fy + 14, sq, sq * 1.4, 4);
    ctx.fill();
  });

  // ── the scout's verdict
  const vy = fy + 14 + sq * 1.4 + 22;
  const vh = H - 62 - vy;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  roundRect(ctx, 60, vy, W - 120, vh, 22);
  ctx.fill();
  ctx.font = `800 18px ${BODY}`;
  ctx.fillStyle = '#fde047';
  ctx.fillText(`SCOUT'S VERDICT${s.scout ? ` · ${s.scout.name.toUpperCase()}` : ''}`, 88, vy + 38);
  ctx.font = `italic 500 23px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  const maxLines = Math.max(1, Math.floor((vh - 52) / 31));
  wrap(ctx, `“${s.verdict}”`, W - 176, maxLines).forEach((line, i) => ctx.fillText(line, 88, vy + 72 + i * 31));

  // ── footer
  ctx.font = `600 20px ${BODY}`;
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fillText('rdolan-gif.github.io/Packdraft', 60, H - 34);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), W - 60, H - 34);
  ctx.textAlign = 'left';

  return canvas;
}

export function seasonCardFileName(teamName: string) {
  const slug = teamName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'PackDraft-XI';
  return `PackDraft38-${slug}-${new Date().toISOString().slice(0, 10)}.png`;
}
