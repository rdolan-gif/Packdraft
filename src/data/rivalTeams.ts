import type { Position } from '../types/game';

export interface RivalPlayer {
  id: string; // basePlayerId convention (surname_firstname) so drafted stars can be lifted out of rival squads
  name: string;
  pos: Position;
  sw: number; // scoring weight
  aw: number; // assist weight
}

export interface RivalTeam {
  code: string; // matches data/clubs.ts
  name: string;
  short: string;
  strength: number; // ~70..90 baseline team rating
  style: 'attack' | 'balanced' | 'defensive';
  players: RivalPlayer[]; // first player must be the GK
  reserves: RivalPlayer[]; // drafted-star replacements (first GK in list is backup keeper)
}

const P = (id: string, name: string, pos: Position, sw: number, aw: number): RivalPlayer => ({ id, name, pos, sw, aw });

// An "all-eras" league: every rival is a greatest-hits version of the club.
export const RIVAL_TEAMS: RivalTeam[] = [
  {
    code: 'MCI', name: 'Manchester City', short: 'MCI', strength: 88.5, style: 'attack',
    players: [P('ederson_ederson', 'Ederson', 'GK', 0, 0.2), P('dias_ruben', 'Rúben Dias', 'CB', 0.5, 0.3), P('rodri_rodri', 'Rodri', 'CDM', 1.2, 1.5), P('silva_david', 'David Silva', 'CAM', 1.6, 4), P('foden_phil', 'Phil Foden', 'RW', 3, 2.4), P('aguero_sergio', 'Sergio Agüero', 'ST', 5.5, 1.2), P('haaland_erling', 'Erling Haaland', 'ST', 7.5, 1)],
    reserves: [P('ortega_stefan', 'Stefan Ortega', 'GK', 0, 0), P('bernardo_silva', 'Bernardo Silva', 'CM', 1.8, 2.4), P('doku_jeremy', 'Jérémy Doku', 'LW', 1.8, 2.2)],
  },
  {
    code: 'ARS', name: 'Arsenal', short: 'ARS', strength: 87.5, style: 'attack',
    players: [P('seaman_david', 'David Seaman', 'GK', 0, 0), P('saliba_william', 'William Saliba', 'CB', 0.6, 0.2), P('vieira_patrick', 'Patrick Vieira', 'CM', 1.4, 1.6), P('bergkamp_dennis', 'Dennis Bergkamp', 'CAM', 3, 4.2), P('saka_bukayo', 'Bukayo Saka', 'RW', 3.6, 3.2), P('pires_robert', 'Robert Pirès', 'LW', 3, 2.8), P('henry_thierry', 'Thierry Henry', 'ST', 7.2, 2.4)],
    reserves: [P('raya_david', 'David Raya', 'GK', 0, 0), P('odegaard_martin', 'Martin Ødegaard', 'CAM', 2.2, 3.4), P('havertz_kai', 'Kai Havertz', 'ST', 3.6, 1.2)],
  },
  {
    code: 'LIV', name: 'Liverpool', short: 'LIV', strength: 87, style: 'attack',
    players: [P('alisson_alisson', 'Alisson', 'GK', 0, 0.1), P('vandijk_virgil', 'Virgil van Dijk', 'CB', 0.9, 0.2), P('alexanderarnold_trent', 'Trent Alexander-Arnold', 'RB', 0.6, 3.6), P('gerrard_steven', 'Steven Gerrard', 'CM', 2.6, 2.4), P('suarez_luis', 'Luis Suárez', 'ST', 5.8, 2.6), P('salah_mohamed', 'Mohamed Salah', 'RW', 6.8, 2.8), P('mane_sadio', 'Sadio Mané', 'LW', 4, 1.8)],
    reserves: [P('kelleher_caoimhin', 'Caoimhín Kelleher', 'GK', 0, 0), P('firmino_roberto', 'Roberto Firmino', 'ST', 3, 2.8), P('diaz_luis', 'Luis Díaz', 'LW', 3, 1.6)],
  },
  {
    code: 'CHE', name: 'Chelsea', short: 'CHE', strength: 85, style: 'balanced',
    players: [P('cech_petr', 'Petr Čech', 'GK', 0, 0), P('terry_john', 'John Terry', 'CB', 1, 0.2), P('makelele_claude', 'Claude Makélélé', 'CDM', 0.2, 0.8), P('lampard_frank', 'Frank Lampard', 'CM', 4.2, 2.6), P('zola_gianfranco', 'Gianfranco Zola', 'CAM', 2.6, 3), P('palmer_cole', 'Cole Palmer', 'RW', 4.8, 2.8), P('drogba_didier', 'Didier Drogba', 'ST', 5.6, 1.8)],
    reserves: [P('sanchez_robert', 'Robert Sánchez', 'GK', 0, 0), P('jackson_nicolas', 'Nicolas Jackson', 'ST', 3.4, 1), P('madueke_noni', 'Noni Madueke', 'RW', 2, 1.6)],
  },
  {
    code: 'MUN', name: 'Manchester United', short: 'MUN', strength: 84.5, style: 'balanced',
    players: [P('schmeichel_peter', 'Peter Schmeichel', 'GK', 0, 0), P('ferdinand_rio', 'Rio Ferdinand', 'CB', 0.5, 0.2), P('keane_roy', 'Roy Keane', 'CDM', 1, 1), P('scholes_paul', 'Paul Scholes', 'CM', 2.8, 2.6), P('giggs_ryan', 'Ryan Giggs', 'LW', 2.4, 3.6), P('cantona_eric', 'Eric Cantona', 'CAM', 4, 3), P('vannistelrooy_ruud', 'Ruud van Nistelrooy', 'ST', 6.4, 1)],
    reserves: [P('onana_andre', 'André Onana', 'GK', 0, 0), P('fernandes_bruno', 'Bruno Fernandes', 'CAM', 3.2, 3.6), P('rashford_marcus', 'Marcus Rashford', 'LW', 3.4, 1.6)],
  },
  {
    code: 'TOT', name: 'Tottenham Hotspur', short: 'TOT', strength: 83, style: 'attack',
    players: [P('lloris_hugo', 'Hugo Lloris', 'GK', 0, 0), P('king_ledley', 'Ledley King', 'CB', 0.4, 0.1), P('modric_luka', 'Luka Modrić', 'CM', 1.2, 3), P('eriksen_christian', 'Christian Eriksen', 'CAM', 2.6, 3.8), P('son_heungmin', 'Son Heung-min', 'LW', 4.6, 2.4), P('bale_gareth', 'Gareth Bale', 'RW', 4, 2.2), P('kane_harry', 'Harry Kane', 'ST', 7.4, 2.4)],
    reserves: [P('vicario_guglielmo', 'Guglielmo Vicario', 'GK', 0, 0), P('vandervaart_rafael', 'Rafael van der Vaart', 'CAM', 2.4, 3), P('defoe_jermain', 'Jermain Defoe', 'ST', 4.4, 0.8)],
  },
  {
    code: 'NEW', name: 'Newcastle United', short: 'NEW', strength: 81.5, style: 'attack',
    players: [P('given_shay', 'Shay Given', 'GK', 0, 0), P('botman_sven', 'Sven Botman', 'CB', 0.5, 0.1), P('guimaraes_bruno', 'Bruno Guimarães', 'CM', 1.6, 2.6), P('benarfa_hatem', 'Hatem Ben Arfa', 'CAM', 2.2, 2.4), P('ginola_david', 'David Ginola', 'LW', 2.4, 3), P('isak_alexander', 'Alexander Isak', 'ST', 5.4, 1.4), P('shearer_alan', 'Alan Shearer', 'ST', 6.6, 1.2)],
    reserves: [P('pope_nick', 'Nick Pope', 'GK', 0, 0), P('gordon_anthony', 'Anthony Gordon', 'LW', 3, 2.2), P('cole_andy', 'Andy Cole', 'ST', 4.6, 1)],
  },
  {
    code: 'AVL', name: 'Aston Villa', short: 'AVL', strength: 81, style: 'balanced',
    players: [P('martinez_emiliano', 'Emiliano Martínez', 'GK', 0, 0), P('konsa_ezri', 'Ezri Konsa', 'CB', 0.4, 0.2), P('mcginn_john', 'John McGinn', 'CM', 2, 2), P('grealish_jack', 'Jack Grealish', 'CAM', 2, 3.6), P('young_ashley', 'Ashley Young', 'LW', 2, 3), P('agbonlahor_gabriel', 'Gabriel Agbonlahor', 'RW', 3, 1.4), P('watkins_ollie', 'Ollie Watkins', 'ST', 5.6, 2)],
    reserves: [P('friedel_brad', 'Brad Friedel', 'GK', 0, 0), P('rogers_morgan', 'Morgan Rogers', 'CAM', 2.4, 2.4), P('benteke_christian', 'Christian Benteke', 'ST', 3.8, 1)],
  },
  {
    code: 'BRI', name: 'Brighton & Hove Albion', short: 'BHA', strength: 79, style: 'attack',
    players: [P('verbruggen_bart', 'Bart Verbruggen', 'GK', 0, 0), P('dunk_lewis', 'Lewis Dunk', 'CB', 0.8, 0.2), P('caicedo_moises', 'Moisés Caicedo', 'CDM', 0.8, 1.2), P('mitoma_kaoru', 'Kaoru Mitoma', 'LW', 3.2, 2.4), P('march_solly', 'Solly March', 'RW', 2.2, 2.6), P('mac_allister_alexis', 'Alexis Mac Allister', 'CM', 2.4, 2), P('welbeck_danny', 'Danny Welbeck', 'ST', 4, 1.2)],
    reserves: [P('steele_jason', 'Jason Steele', 'GK', 0, 0), P('joaopedro_joao', 'João Pedro', 'ST', 3.6, 1.6), P('gross_pascal', 'Pascal Groß', 'CM', 1.6, 3)],
  },
  {
    code: 'WHU', name: 'West Ham United', short: 'WHU', strength: 78.5, style: 'balanced',
    players: [P('james_david', 'David James', 'GK', 0, 0), P('ferdinand_anton', 'Anton Ferdinand', 'CB', 0.4, 0.1), P('rice_declan', 'Declan Rice', 'CDM', 1.2, 1.4), P('payet_dimitri', 'Dimitri Payet', 'CAM', 3, 4), P('dicanio_paolo', 'Paolo Di Canio', 'RW', 4, 2.4), P('bowen_jarrod', 'Jarrod Bowen', 'RW', 4.6, 2.2), P('antonio_michail', 'Michail Antonio', 'ST', 4, 1.4)],
    reserves: [P('areola_alphonse', 'Alphonse Areola', 'GK', 0, 0), P('paqueta_lucas', 'Lucas Paquetá', 'CAM', 2.4, 2.6), P('noble_mark', 'Mark Noble', 'CM', 1.6, 1.6)],
  },
  {
    code: 'EVE', name: 'Everton', short: 'EVE', strength: 77.5, style: 'defensive',
    players: [P('pickford_jordan', 'Jordan Pickford', 'GK', 0, 0), P('baines_leighton', 'Leighton Baines', 'LB', 1.2, 3), P('coleman_seamus', 'Seamus Coleman', 'RB', 0.8, 1.4), P('cahill_tim', 'Tim Cahill', 'CAM', 4, 1.4), P('arteta_mikel', 'Mikel Arteta', 'CM', 1.6, 3), P('fellaini_marouane', 'Marouane Fellaini', 'CM', 2.4, 1.4), P('lukaku_romelu', 'Romelu Lukaku', 'ST', 5.6, 1.4)],
    reserves: [P('howard_tim', 'Tim Howard', 'GK', 0, 0), P('calvertlewin_dominic', 'Dominic Calvert-Lewin', 'ST', 4, 1), P('mcneil_dwight', 'Dwight McNeil', 'LW', 2, 2.6)],
  },
  {
    code: 'CRY', name: 'Crystal Palace', short: 'CRY', strength: 77, style: 'defensive',
    players: [P('henderson_dean', 'Dean Henderson', 'GK', 0, 0), P('guehi_marc', 'Marc Guéhi', 'CB', 0.5, 0.2), P('wharton_adam', 'Adam Wharton', 'CM', 0.8, 2), P('eze_eberechi', 'Eberechi Eze', 'CAM', 3.4, 2.8), P('zaha_wilfried', 'Wilfried Zaha', 'LW', 3.6, 2.4), P('bolasie_yannick', 'Yannick Bolasie', 'RW', 2, 2.4), P('mateta_jeanphilippe', 'Jean-Philippe Mateta', 'ST', 4.6, 1)],
    reserves: [P('speroni_julian', 'Julián Speroni', 'GK', 0, 0), P('olise_michael', 'Michael Olise', 'RW', 3, 3), P('puncheon_jason', 'Jason Puncheon', 'CM', 1.4, 1.4)],
  },
  {
    code: 'FUL', name: 'Fulham', short: 'FUL', strength: 76.5, style: 'balanced',
    players: [P('leno_bernd', 'Bernd Leno', 'GK', 0, 0), P('hangeland_brede', 'Brede Hangeland', 'CB', 0.6, 0.1), P('murphy_danny', 'Danny Murphy', 'CM', 1.6, 2.6), P('dempsey_clint', 'Clint Dempsey', 'CAM', 3.6, 1.6), P('iwobi_alex', 'Alex Iwobi', 'LW', 2.2, 2.6), P('mitrovic_aleksandar', 'Aleksandar Mitrović', 'ST', 5.4, 1), P('saviola_javier', 'Javier Saviola', 'ST', 2.6, 1.2)],
    reserves: [P('schwarzer_mark', 'Mark Schwarzer', 'GK', 0, 0), P('pereira_andreas', 'Andreas Pereira', 'CAM', 1.6, 2.4), P('vinicius_carlos', 'Carlos Vinícius', 'ST', 3, 1)],
  },
  {
    code: 'BRE', name: 'Brentford', short: 'BRE', strength: 76, style: 'attack',
    players: [P('flekken_mark', 'Mark Flekken', 'GK', 0, 0), P('pinnock_ethan', 'Ethan Pinnock', 'CB', 0.6, 0.2), P('norgaard_christian', 'Christian Nørgaard', 'CDM', 0.8, 1.4), P('damsgaard_mikkel', 'Mikkel Damsgaard', 'CAM', 1.4, 3), P('mbeumo_bryan', 'Bryan Mbeumo', 'RW', 4.6, 2.6), P('wissa_yoane', 'Yoane Wissa', 'LW', 4, 1.4), P('toney_ivan', 'Ivan Toney', 'ST', 5, 1.4)],
    reserves: [P('strakosha_thomas', 'Thomas Strakosha', 'GK', 0, 0), P('jensen_mathias', 'Mathias Jensen', 'CM', 1.4, 2), P('schade_kevin', 'Kevin Schade', 'LW', 2, 1)],
  },
  {
    code: 'WOL', name: 'Wolverhampton Wanderers', short: 'WOL', strength: 75.5, style: 'defensive',
    players: [P('sa_jose', 'José Sá', 'GK', 0, 0), P('coady_conor', 'Conor Coady', 'CB', 0.3, 0.2), P('neves_ruben', 'Rúben Neves', 'CDM', 2, 2), P('moutinho_joao', 'João Moutinho', 'CM', 0.8, 2.6), P('traore_adama', 'Adama Traoré', 'RW', 1.6, 2.6), P('cunha_matheus', 'Matheus Cunha', 'CAM', 4, 2), P('jimenez_raul', 'Raúl Jiménez', 'ST', 4.6, 1.4)],
    reserves: [P('patricio_rui', 'Rui Patrício', 'GK', 0, 0), P('hwang_heechan', 'Hwang Hee-chan', 'ST', 3, 1), P('neto_pedro', 'Pedro Neto', 'LW', 2, 2.8)],
  },
  {
    code: 'BOU', name: 'AFC Bournemouth', short: 'BOU', strength: 75, style: 'attack',
    players: [P('kepa_kepa', 'Kepa Arrizabalaga', 'GK', 0, 0), P('zabarnyi_illia', 'Illia Zabarnyi', 'CB', 0.4, 0.1), P('cook_lewis', 'Lewis Cook', 'CM', 0.8, 1.8), P('kluivert_justin', 'Justin Kluivert', 'CAM', 3.2, 2.4), P('semenyo_antoine', 'Antoine Semenyo', 'RW', 4, 1.8), P('king_joshua', 'Joshua King', 'LW', 3.2, 1.6), P('wilson_callum', 'Callum Wilson', 'ST', 4.6, 1.2)],
    reserves: [P('boruc_artur', 'Artur Boruc', 'GK', 0, 0), P('evanilson_evanilson', 'Evanilson', 'ST', 3.6, 1), P('fraser_ryan', 'Ryan Fraser', 'LW', 1.8, 3)],
  },
  {
    code: 'NFO', name: 'Nottingham Forest', short: 'NFO', strength: 75, style: 'defensive',
    players: [P('sels_matz', 'Matz Sels', 'GK', 0, 0), P('murillo_murillo', 'Murillo', 'CB', 0.4, 0.4), P('anderson_elliot', 'Elliot Anderson', 'CM', 1.4, 2.4), P('gibbswhite_morgan', 'Morgan Gibbs-White', 'CAM', 2.6, 3.4), P('hudsonodoi_callum', 'Callum Hudson-Odoi', 'LW', 2.4, 1.6), P('elanga_anthony', 'Anthony Elanga', 'RW', 2.4, 2.6), P('wood_chris', 'Chris Wood', 'ST', 5.6, 0.8)],
    reserves: [P('turner_matt', 'Matt Turner', 'GK', 0, 0), P('awoniyi_taiwo', 'Taiwo Awoniyi', 'ST', 3, 0.6), P('yates_ryan', 'Ryan Yates', 'CM', 1, 1)],
  },
  {
    code: 'LEI', name: 'Leicester City', short: 'LEI', strength: 74, style: 'defensive',
    players: [P('schmeichel_kasper', 'Kasper Schmeichel', 'GK', 0, 0), P('morgan_wes', 'Wes Morgan', 'CB', 0.6, 0.1), P('drinkwater_danny', 'Danny Drinkwater', 'CM', 1, 2.2), P('maddison_james', 'James Maddison', 'CAM', 3, 3), P('albrighton_marc', 'Marc Albrighton', 'LW', 1.2, 3.2), P('mahrez_riyad', 'Riyad Mahrez', 'RW', 4.2, 2.8), P('vardy_jamie', 'Jamie Vardy', 'ST', 6.4, 1.4)],
    reserves: [P('ward_danny', 'Danny Ward', 'GK', 0, 0), P('okazaki_shinji', 'Shinji Okazaki', 'ST', 2.6, 1), P('barnes_harvey', 'Harvey Barnes', 'LW', 2.6, 1.8)],
  },
  {
    code: 'SOU', name: 'Southampton', short: 'SOU', strength: 72.5, style: 'balanced',
    players: [P('forster_fraser', 'Fraser Forster', 'GK', 0, 0), P('fonte_jose', 'José Fonte', 'CB', 0.6, 0.1), P('wardprowse_james', 'James Ward-Prowse', 'CM', 2.6, 2.6), P('letissier_matt', 'Matt Le Tissier', 'CAM', 5, 2.4), P('lallana_adam', 'Adam Lallana', 'CAM', 2, 2.4), P('lambert_rickie', 'Rickie Lambert', 'ST', 3.8, 1.6), P('ings_danny', 'Danny Ings', 'ST', 4.4, 1)],
    reserves: [P('mccarthy_alex', 'Alex McCarthy', 'GK', 0, 0), P('pelle_graziano', 'Graziano Pellè', 'ST', 3.4, 1), P('tadic_dusan', 'Dušan Tadić', 'LW', 2, 3.4)],
  },
];
