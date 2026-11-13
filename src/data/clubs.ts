import type { Club } from '../types/game';

// Era-flavoured kit colours. Procedural only — no crests or logos.
const list: Club[] = [
  { code: 'ARS', name: 'Arsenal', short: 'ARS', primary: '#db0007', secondary: '#ffffff', accent: '#063672', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'MUN', name: 'Manchester United', short: 'MUN', primary: '#da291c', secondary: '#ffffff', accent: '#fbe122', sleeve: '#da291c', collar: '#ffffff' },
  { code: 'CHE', name: 'Chelsea', short: 'CHE', primary: '#034694', secondary: '#ffffff', accent: '#dba111', sleeve: '#034694', collar: '#ffffff' },
  { code: 'LIV', name: 'Liverpool', short: 'LIV', primary: '#c8102e', secondary: '#f6eb61', accent: '#00b2a9', sleeve: '#c8102e', collar: '#f6eb61' },
  { code: 'MCI', name: 'Manchester City', short: 'MCI', primary: '#6cabdd', secondary: '#ffffff', accent: '#1c2c5b', sleeve: '#6cabdd', collar: '#ffffff' },
  { code: 'TOT', name: 'Tottenham Hotspur', short: 'TOT', primary: '#f4f4f4', secondary: '#132257', accent: '#132257', sleeve: '#132257', collar: '#132257' },
  { code: 'EVE', name: 'Everton', short: 'EVE', primary: '#003399', secondary: '#ffffff', accent: '#ffffff', sleeve: '#003399', collar: '#ffffff' },
  { code: 'NEW', name: 'Newcastle United', short: 'NEW', primary: '#241f20', secondary: '#ffffff', accent: '#41b6e6', sleeve: '#ffffff', collar: '#241f20' },
  { code: 'AVL', name: 'Aston Villa', short: 'AVL', primary: '#670e36', secondary: '#95bfe5', accent: '#fee505', sleeve: '#95bfe5', collar: '#670e36' },
  { code: 'WHU', name: 'West Ham United', short: 'WHU', primary: '#7a263a', secondary: '#1bb1e7', accent: '#f3d459', sleeve: '#1bb1e7', collar: '#1bb1e7' },
  { code: 'LEI', name: 'Leicester City', short: 'LEI', primary: '#003090', secondary: '#fdbe11', accent: '#ffffff', sleeve: '#003090', collar: '#fdbe11' },
  { code: 'SOU', name: 'Southampton', short: 'SOU', primary: '#d71920', secondary: '#ffffff', accent: '#130c0e', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'BLB', name: 'Blackburn Rovers', short: 'BLB', primary: '#009ee0', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'BOL', name: 'Bolton Wanderers', short: 'BOL', primary: '#f5f5f5', secondary: '#263c7e', accent: '#c8102e', sleeve: '#263c7e', collar: '#263c7e' },
  { code: 'STK', name: 'Stoke City', short: 'STK', primary: '#e03a3e', secondary: '#ffffff', accent: '#1b449c', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'SWA', name: 'Swansea City', short: 'SWA', primary: '#f5f5f5', secondary: '#121212', accent: '#121212', sleeve: '#f5f5f5', collar: '#121212' },
  { code: 'QPR', name: 'Queens Park Rangers', short: 'QPR', primary: '#1d5ba4', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#1d5ba4' },
  { code: 'CRY', name: 'Crystal Palace', short: 'CRY', primary: '#1b458f', secondary: '#c4122e', accent: '#a7a5a6', sleeve: '#c4122e', collar: '#1b458f' },
  { code: 'LEE', name: 'Leeds United', short: 'LEE', primary: '#f5f5f5', secondary: '#1d428a', accent: '#ffcd00', sleeve: '#1d428a', collar: '#1d428a' },
  { code: 'POR', name: 'Portsmouth', short: 'POR', primary: '#001489', secondary: '#ffffff', accent: '#c8102e', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'FUL', name: 'Fulham', short: 'FUL', primary: '#f5f5f5', secondary: '#000000', accent: '#cc0000', sleeve: '#000000', collar: '#000000' },
  { code: 'SUN', name: 'Sunderland', short: 'SUN', primary: '#eb172b', secondary: '#ffffff', accent: '#211e1e', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'MID', name: 'Middlesbrough', short: 'MID', primary: '#e11b22', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'WIG', name: 'Wigan Athletic', short: 'WIG', primary: '#1d59af', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'WBA', name: 'West Bromwich Albion', short: 'WBA', primary: '#122f67', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'BRI', name: 'Brighton & Hove Albion', short: 'BHA', primary: '#0057b8', secondary: '#ffffff', accent: '#ffcd00', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'WOL', name: 'Wolverhampton Wanderers', short: 'WOL', primary: '#fdb913', secondary: '#231f20', accent: '#231f20', sleeve: '#231f20', collar: '#231f20' },
  { code: 'NFO', name: 'Nottingham Forest', short: 'NFO', primary: '#dd0000', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'BRE', name: 'Brentford', short: 'BRE', primary: '#e30613', secondary: '#ffffff', accent: '#140e0c', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'BOU', name: 'AFC Bournemouth', short: 'BOU', primary: '#da291c', secondary: '#000000', accent: '#000000', sleeve: '#000000', collar: '#000000' },
  { code: 'NOR', name: 'Norwich City', short: 'NOR', primary: '#fff200', secondary: '#00a650', accent: '#00a650', sleeve: '#00a650', collar: '#00a650' },
  { code: 'WAT', name: 'Watford', short: 'WAT', primary: '#fbee23', secondary: '#ed2127', accent: '#11210c', sleeve: '#ed2127', collar: '#ed2127' },
  { code: 'BIR', name: 'Birmingham City', short: 'BIR', primary: '#0000ff', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'CHA', name: 'Charlton Athletic', short: 'CHA', primary: '#d4021d', secondary: '#ffffff', accent: '#ffffff', sleeve: '#ffffff', collar: '#ffffff' },
  { code: 'HUL', name: 'Hull City', short: 'HUL', primary: '#f5a12d', secondary: '#000000', accent: '#000000', sleeve: '#000000', collar: '#000000' },
  { code: 'WIM', name: 'Wimbledon', short: 'WIM', primary: '#1d2c63', secondary: '#fcd116', accent: '#fcd116', sleeve: '#fcd116', collar: '#fcd116' },
];

export const CLUBS: Record<string, Club> = Object.fromEntries(list.map((c) => [c.code, c]));

export function getClub(code: string): Club {
  return CLUBS[code] ?? { code, name: code, short: code, primary: '#334155', secondary: '#e2e8f0', accent: '#94a3b8', sleeve: '#e2e8f0', collar: '#e2e8f0' };
}
