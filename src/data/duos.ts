// Hidden famous duos: put both players in your XI on linked positions (any cards of them) and they
// form a special link worth +3 chemistry each. Never listed in the game: players find them by accident.

export interface Duo {
  id: string;
  a: string; // base player id
  b: string;
  name: string;
}

export const DUO_BONUS = 3;

export const DUOS: Duo[] = [
  { id: 'henry_bergkamp', a: 'henry_thierry', b: 'bergkamp_dennis', name: 'Henry & Bergkamp' },
  { id: 'henry_pires', a: 'henry_thierry', b: 'pires_robert', name: 'Henry & Pires' },
  { id: 'vieira_petit', a: 'vieira_patrick', b: 'petit_emmanuel', name: 'Vieira & Petit' },
  { id: 'adams_keown', a: 'adams_tony', b: 'keown_martin', name: 'Adams & Keown' },
  { id: 'dixon_winterburn', a: 'dixon_lee', b: 'winterburn_nigel', name: 'Dixon & Winterburn' },
  { id: 'saka_odegaard', a: 'saka_bukayo', b: 'odegaard_martin', name: 'Saka & Ødegaard' },
  { id: 'gerrard_torres', a: 'gerrard_steven', b: 'torres_fernando', name: 'Gerrard & Torres' },
  { id: 'suarez_sturridge', a: 'suarez_luis', b: 'sturridge_daniel', name: 'Suárez & Sturridge' },
  { id: 'carragher_hyypia', a: 'carragher_jamie', b: 'hyypia_sami', name: 'Carragher & Hyypiä' },
  { id: 'salah_mane', a: 'salah_mohamed', b: 'mane_sadio', name: 'Salah & Mané' },
  { id: 'trent_robertson', a: 'alexanderarnold_trent', b: 'robertson_andrew', name: 'Trent & Robertson' },
  { id: 'fowler_mcmanaman', a: 'fowler_robbie', b: 'mcmanaman_steve', name: 'Fowler & McManaman' },
  { id: 'cole_yorke', a: 'cole_andy', b: 'yorke_dwight', name: 'Cole & Yorke' },
  { id: 'rio_vidic', a: 'ferdinand_rio', b: 'vidic_nemanja', name: 'Ferdinand & Vidić' },
  { id: 'rooney_ronaldo', a: 'rooney_wayne', b: 'ronaldo_cristiano', name: 'Rooney & Ronaldo' },
  { id: 'scholes_keane', a: 'scholes_paul', b: 'keane_roy', name: 'Scholes & Keane' },
  { id: 'beckham_neville', a: 'beckham_david', b: 'neville_gary', name: 'Beckham & Neville' },
  { id: 'cantona_giggs', a: 'cantona_eric', b: 'giggs_ryan', name: 'Cantona & Giggs' },
  { id: 'bruno_rashford', a: 'fernandes_bruno', b: 'rashford_marcus', name: 'Bruno & Rashford' },
  { id: 'lampard_drogba', a: 'lampard_frank', b: 'drogba_didier', name: 'Lampard & Drogba' },
  { id: 'terry_carvalho', a: 'terry_john', b: 'carvalho_ricardo', name: 'Terry & Carvalho' },
  { id: 'makelele_essien', a: 'makelele_claude', b: 'essien_michael', name: 'Makélélé & Essien' },
  { id: 'aguero_silva', a: 'aguero_sergio', b: 'silva_david', name: 'Agüero & Silva' },
  { id: 'kdb_haaland', a: 'debruyne_kevin', b: 'haaland_erling', name: 'De Bruyne & Haaland' },
  { id: 'kompany_zabaleta', a: 'kompany_vincent', b: 'zabaleta_pablo', name: 'Kompany & Zabaleta' },
  { id: 'kane_son', a: 'kane_harry', b: 'son_heungmin', name: 'Kane & Son' },
  { id: 'shearer_sutton', a: 'shearer_alan', b: 'sutton_chris', name: 'Shearer & Sutton' },
  { id: 'ginola_ferdinand', a: 'ginola_david', b: 'ferdinand_les', name: 'Ginola & Ferdinand' },
  { id: 'vardy_mahrez', a: 'vardy_jamie', b: 'mahrez_riyad', name: 'Vardy & Mahrez' },
];

const KEY = 'pd38_duos_v1';

/** Duo id -> date first discovered. */
export function loadDuos(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** Record duos as discovered. Returns the ones that are new. */
export function discoverDuos(ids: string[]): string[] {
  const found = loadDuos();
  const fresh = ids.filter((id) => !found[id]);
  if (!fresh.length) return [];
  const now = new Date().toISOString();
  fresh.forEach((id) => (found[id] = now));
  try {
    localStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    /* storage unavailable */
  }
  return fresh;
}
