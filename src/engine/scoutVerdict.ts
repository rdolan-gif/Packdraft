import { FORMATIONS, positionGroup } from '../data/formations';
import { getClub } from '../data/clubs';
import type { FormationId, Grade, Lineup, PlayerCard, PlayerSeasonStats, TableRow, TeamRating } from '../types/game';
import type { SeasonSim } from './seasonSimulator';

// The Scout's verdict: one of four scouts reviews the season in their own voice.
//   1. Opener: leads with the most remarkable thing about the season (title race, attack, keeper, streaks...).
//   2. Draft remark: something about the cards you picked (a bargain, a flop, an era mash-up...).
//   3. Closer: the final word, by grade.
// Lines used recently on this device are skipped, so verdicts don't repeat back to back.

export type ScoutId = 'pro' | 'nerd' | 'hack' | 'comm';
export interface Scout {
  id: ScoutId;
  name: string;
  emoji: string;
}
export const SCOUTS: Record<ScoutId, Scout> = {
  pro: { id: 'pro', name: 'The Old Pro', emoji: '🧓' },
  nerd: { id: 'nerd', name: 'The Stats Nerd', emoji: '🤓' },
  hack: { id: 'hack', name: 'The Tabloid Hack', emoji: '📰' },
  comm: { id: 'comm', name: 'The Commentator', emoji: '🎙️' },
};
const SCOUT_IDS = Object.keys(SCOUTS) as ScoutId[];

/** Everything a line can mention. Only the fields an angle needs are guaranteed to be set when it's picked. */
interface Facts {
  pos: string;
  pts: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  s1: string;
  s2: string;
  gap: string;
  weeksTop: number;
  fromMw: number;
  lastTopMw: number;
  midPos: string;
  gaPer: string;
  scorer: string;
  goals: number;
  share: number;
  rest: number;
  gk: string;
  cs: number;
  csPct: number;
  streak: number;
  winless: number;
  lostPts: number;
  signing: string;
  sga: number;
  calls: number;
  callsWon: number;
  callsLost: number;
  winPct: number;
  eraName: string;
  dev: string;
  flop: string;
  flopGA: number;
  gem: string;
  gemOvr: number;
  gemFeat: string;
  oldest: string;
  newest: string;
  span: number;
  club: string;
  clubN: number;
  role: string;
  slotRole: string;
  chem: number;
}

type Line = (f: Facts) => string;
type Voiced = Record<ScoutId, Line[]>;

// ───────────────────────────── openers ─────────────────────────────

const OPENERS: Record<string, Voiced> = {
  perfect: {
    pro: [() => "Thirty-eight played, thirty-eight won. I've been in this game fifty years and never seen the like.", () => 'Not a single dropped point all season. I had to sit down.'],
    nerd: [() => "38 wins from 38. My model gave that roughly a 1-in-4,000 chance, and I've rechecked it twice.", () => "A 100% win rate across 38 games. There's no error bar for this."],
    hack: [(f) => `PERFECTION! 38 games, 38 wins, ${f.pts} points and not a single excuse needed.`, () => 'THE IMMORTALS! Thirty-eight wins on the spin and rivals left begging for mercy.'],
    comm: [() => 'THIRTY-EIGHT FROM THIRTY-EIGHT! You will never, ever see this again!', () => 'Every week, the same result! A perfect season, and I was there for every minute of it!'],
  },
  invincible: {
    pro: [() => "Unbeaten all season. That's not luck, that's a dressing room that hates losing.", () => 'Thirty-eight games and nobody laid a glove on them. Proper old-fashioned steel.'],
    nerd: [() => 'Zero defeats in 38. Only a handful of real Premier League sides have managed that.', (f) => `${f.d} draws and not one loss: a points floor no rival could crack.`],
    hack: [() => 'INVINCIBLES! Not one defeat all season and the critics have gone very quiet.', (f) => `UNBEATABLE! ${f.w} wins, ${f.d} draws and a big fat zero in the losses column.`],
    comm: [() => 'UNBEATEN! Thirty-eight games and they never once walked off losers!', () => 'Nobody could beat them! Not at home, not away, not anywhere!'],
  },
  wireToWire: {
    pro: [() => "Top of the pile from the opening weeks and never looked down. That's how you win a league.", () => 'Led from August to May. The rest were playing for second.'],
    nerd: [(f) => `Top of the table for ${f.weeksTop} of 38 matchweeks. The title race was over before the clocks went back.`, (f) => `Never below first after matchweek ${f.fromMw}. Title probability was effectively 100% by spring.`],
    hack: [() => 'WIRE TO WIRE! Top from start to finish and rivals never got a sniff.', () => 'PROCESSION! The trophy was engraved by Christmas.'],
    comm: [() => 'Out in front from the first whistle and they never let go!', () => 'Top in August, top in May, and top every week in between!'],
  },
  lastDay: {
    pro: [(f) => `Won it by ${f.gap}. Nerves of steel when it mattered.`, () => 'Down to the wire and they held their bottle. Champions by a whisker.'],
    nerd: [(f) => `Champions by ${f.gap}. The title was decided by the slimmest margin there is.`, (f) => `A title margin of ${f.gap}: about one bad bounce from finishing second.`],
    hack: [(f) => `PHOTO FINISH! Title snatched by ${f.gap} in a heart-stopping race.`, (f) => `SQUEAKY BUM TIME! Champions by ${f.gap}, and the fans needed oxygen.`],
    comm: [(f) => `By ${f.gap}! By ${f.gap}! I can hardly breathe!`, (f) => `Right to the wire, and they've done it by ${f.gap}!`],
  },
  pipped: {
    pro: [(f) => `Second by ${f.gap}. That one'll keep them up at night.`, () => 'Pipped at the post. Fine margins, son, fine margins.'],
    nerd: [(f) => `Missed the title by ${f.gap}. Swing one draw into a win and it's a parade.`, (f) => `Runners-up by ${f.gap}: the most painful margin in football.`],
    hack: [(f) => `HEARTBREAK! Title lost by just ${f.gap}.`, (f) => `SO NEAR! Pipped by ${f.gap} and the dressing room is in bits.`],
    comm: [(f) => `Oh, so close! Just ${f.gap} in it at the end!`, (f) => `Agony! The title slips away by ${f.gap}!`],
  },
  collapse: {
    pro: [(f) => `Top at matchweek ${f.lastTopMw}, ${f.pos} by May. Bottled it, plain and simple.`, () => "Had the league in their hands and let it slip. Spring's a cruel time."],
    nerd: [(f) => `Top as late as matchweek ${f.lastTopMw}, then finished ${f.pos}. One of the steepest late drops I've tracked.`, (f) => `Led the table at matchweek ${f.lastTopMw}; the form fell off a cliff from there.`],
    hack: [(f) => `BOTTLE JOB! Top in matchweek ${f.lastTopMw}, ${f.pos} at the finish.`, () => 'COLLAPSE! A title charge that fell apart in spring.'],
    comm: [(f) => `They were top at matchweek ${f.lastTopMw}! How has it ended in ${f.pos}?`, (f) => `What a fall! Leaders in spring, and ${f.pos} by the end!`],
  },
  climb: {
    pro: [(f) => `${f.midPos} at Christmas and they finished ${f.pos}. Somebody gave a hell of a team talk.`, () => 'Written off at the halfway point. Good sides find a way back.'],
    nerd: [(f) => `From ${f.midPos} at the halfway mark to ${f.pos}: the biggest second-half swing of the season.`, (f) => `Second-half form was title-winning: ${f.midPos} at matchweek 19, ${f.pos} at the end.`],
    hack: [(f) => `GREAT ESCAPE! ${f.midPos} at Christmas, ${f.pos} come May.`, () => 'COMEBACK KINGS! From mid-table mess to the top four.'],
    comm: [(f) => `${f.midPos} at Christmas! ${f.pos} at the end! What a turnaround!`, () => 'From nowhere! What a second half of the season!'],
  },
  bottom: {
    pro: [(f) => `${f.pos}. With that squad. I've seen pub sides with more organisation.`, (f) => `Finished ${f.pos} and lucky it wasn't worse.`],
    nerd: [(f) => `${f.pos} with this much talent is a statistical crime.`, (f) => `${f.pts} points from 38 games. Even the underlying numbers can't explain it.`],
    hack: [(f) => `SHAMBLES! A star-studded squad finished ${f.pos}.`, (f) => `DISASTER! ${f.pts} points and a season to forget.`],
    comm: [(f) => `${f.pos}! How has it come to this?`, (f) => `They're down in ${f.pos}, and nobody saw that coming!`],
  },
  leaky: {
    pro: [(f) => `${f.gf} scored, ${f.ga} let in. Great to watch, a nightmare to coach.`, () => "Brilliant going forward, but defend like that and you'll never sleep."],
    nerd: [(f) => `${f.gf} for, ${f.ga} against: an elite attack bolted onto a bottom-half defence.`, (f) => `The most chaotic games in the league: ${f.gf} scored and ${f.ga} conceded.`],
    hack: [(f) => `GOAL FEST! ${f.gf} scored, ${f.ga} let in, and not a dull game all season.`, () => 'CAVALIERS! They scored for fun and defended like strangers.'],
    comm: [(f) => `Goals at both ends! ${f.gf} for, ${f.ga} against: what a ride!`, () => "Entertainers! You never knew whether it'd be 4-3 or 5-4!"],
  },
  fortress: {
    pro: [(f) => `Only ${f.ga} conceded. Defenders who actually defend: what a novelty.`, () => "Built on a back line you couldn't get a bus past."],
    nerd: [(f) => `${f.ga} goals conceded, ${f.gaPer} per game. Elite by any era's standards.`, (f) => `Just ${f.ga} goals against all season: the best defensive record I've logged.`],
    hack: [(f) => `BRICK WALL! Just ${f.ga} goals conceded all season.`, () => 'FORTRESS! Strikers needed a map to find this net.'],
    comm: [(f) => `Only ${f.ga} conceded! You couldn't get past them with a key!`, (f) => `What a defence! ${f.ga} goals against in thirty-eight games!`],
  },
  goalMachine: {
    pro: [(f) => `Give ${f.scorer} the ball in the box and get out of the way. ${f.goals} goals.`, (f) => `${f.scorer} scored ${f.goals}. Proper No.9 stuff.`],
    nerd: [(f) => `${f.scorer}: ${f.goals} league goals, a conversion rate my spreadsheet flagged as an error.`, (f) => `${f.scorer} scored ${f.goals}, a total that wins the Golden Boot in almost any season.`],
    hack: [(f) => `GOAL MACHINE! ${f.scorer} smashed in ${f.goals} league goals.`, (f) => `${f.scorer.toUpperCase()} BANGS IN ${f.goals}!`],
    comm: [(f) => `${f.scorer}! Again! ${f.goals} goals this season!`, (f) => `${f.goals} goals for ${f.scorer}! Unstoppable!`],
  },
  oneManTeam: {
    pro: [(f) => `Lose ${f.scorer} and this side is in real trouble: ${f.share}% of the goals came from one man.`, (f) => `${f.scorer} scored ${f.goals}. The rest should be buying the drinks.`],
    nerd: [(f) => `${f.scorer} scored ${f.share}% of the team's goals. That's a dangerous dependency.`, (f) => `Take away ${f.scorer}'s ${f.goals} goals and this side scored just ${f.rest} all season.`],
    hack: [(f) => `ONE-MAN BAND! ${f.scorer} scored ${f.share}% of the goals.`, (f) => `${f.scorer.toUpperCase()} CARRIES THE TEAM! ${f.goals} of ${f.gf} goals.`],
    comm: [(f) => `It's always ${f.scorer}! ${f.goals} of their ${f.gf} goals!`, (f) => `${f.scorer} again! Who else was going to score?`],
  },
  keeper: {
    pro: [(f) => `${f.gk} kept ${f.cs} clean sheets. A keeper like that is worth fifteen points.`, (f) => `${f.cs} clean sheets for ${f.gk}. Safe hands, old school.`],
    nerd: [(f) => `${f.gk}: ${f.cs} clean sheets, a shutout in ${f.csPct}% of matches.`, (f) => `${f.gk} kept a clean sheet in ${f.csPct}% of games. Elite shot-stopping numbers.`],
    hack: [(f) => `SUPER SAVER! ${f.gk} kept ${f.cs} clean sheets.`, (f) => `${f.gk.toUpperCase()} SHUTS THE DOOR ${f.cs} TIMES!`],
    comm: [(f) => `${f.gk}! Another clean sheet! That's ${f.cs} this season!`, (f) => `What a goalkeeper! ${f.cs} shutouts for ${f.gk}!`],
  },
  winStreak: {
    pro: [(f) => `${f.streak} wins on the bounce. Momentum is a wonderful thing.`, (f) => `Once they got rolling, ${f.streak} straight wins. Nobody could live with them.`],
    nerd: [(f) => `A ${f.streak}-game winning run. Even for a top side, the odds of that are slim.`, (f) => `${f.streak} consecutive wins: the longest run of the season.`],
    hack: [(f) => `UNSTOPPABLE! ${f.streak} wins in a row.`, (f) => `ON FIRE! A ${f.streak}-game winning streak.`],
    comm: [(f) => `${f.streak} in a row! They just keep winning!`, (f) => `Win after win after win! ${f.streak} straight!`],
  },
  winless: {
    pro: [(f) => `${f.winless} games without a win. That's when you find out who your leaders are.`, (f) => `A ${f.winless}-match drought nearly sank them.`],
    nerd: [(f) => `A ${f.winless}-game winless run did most of the damage.`, (f) => `Remove the ${f.winless}-game slump and this is a different season.`],
    hack: [(f) => `CRISIS! ${f.winless} games without a win.`, (f) => `MELTDOWN! A ${f.winless}-game winless run.`],
    comm: [(f) => `${f.winless} without a win! When will it end?`, (f) => `The drought! ${f.winless} games without a victory!`],
  },
  draws: {
    pro: [(f) => `${f.d} draws. Hard to beat, harder to watch.`, (f) => `Drew ${f.d} times. Turn half of those into wins and it's a different story.`],
    nerd: [(f) => `${f.d} draws, and every one cost two points: ${f.lostPts} points left on the table.`, (f) => `${f.d} draws from 38 is well above the league norm.`],
    hack: [(f) => `DRAW SPECIALISTS! ${f.d} stalemates all season.`, (f) => `BORE DRAW! ${f.d} games ended level.`],
    comm: [(f) => `Another draw! That's ${f.d} this season!`, (f) => `Level again! ${f.d} draws, can you believe it?`],
  },
  signing: {
    pro: [(f) => `January signing ${f.signing} was a masterstroke: ${f.sga} goals and assists in half a season.`, (f) => `Bringing in ${f.signing} in January turned their season.`],
    nerd: [(f) => `${f.signing} added ${f.sga} goal involvements after January. The best mid-season business going.`, (f) => `${f.sga} goals and assists from January signing ${f.signing}. Superb return on a half-season.`],
    hack: [(f) => `MASTERSTROKE! January buy ${f.signing} delivered ${f.sga} goals and assists.`, (f) => `BARGAIN BUY! ${f.signing} lit up the second half of the season.`],
    comm: [(f) => `${f.signing}, what a signing! ${f.sga} goal involvements after January!`, (f) => `The January window paid off! ${f.signing} was brilliant!`],
  },
  gambler: {
    pro: [(f) => `All-Out Attack ${f.calls} times, lost ${f.callsLost}. Sometimes you just shut up shop.`],
    nerd: [(f) => `Touchline calls won just ${f.winPct}% of the time. The data says stop pressing that button.`],
    hack: [(f) => `GAMBLE BACKFIRES! Touchline calls lost ${f.callsLost} of ${f.calls}.`],
    comm: [() => "Throw everyone forward! And again! It didn't always work!"],
  },
  shrewd: {
    pro: [(f) => `The touchline calls were spot on: ${f.callsWon} wins from ${f.calls}.`],
    nerd: [(f) => `Touchline calls won ${f.callsWon} of ${f.calls}. That's a manager reading the game.`],
    hack: [(f) => `TACTICAL GENIUS! Won ${f.callsWon} of ${f.calls} touchline calls.`],
    comm: [(f) => `The manager's changes worked again! ${f.callsWon} wins from ${f.calls} calls!`],
  },
  era: {
    pro: [(f) => `The ${f.eraName} was no place for the faint-hearted, and this side finished ${f.pos}.`],
    nerd: [(f) => `Adjusted for the ${f.eraName}'s scoring rates, a ${f.pos}-place finish looks about right.`],
    hack: [(f) => `${f.eraName.toUpperCase()} FLASHBACK! A ${f.pos}-place finish in a league that took no prisoners.`],
    comm: [(f) => `Back to the ${f.eraName}, and they finish ${f.pos}!`],
  },
};

/** Fallback openers by result, led by the two standout players. */
const STAR_OPENERS: Record<'top' | 'champ' | 'hunt' | 'lonely' | 'sink', Line[]> = {
  top: [(f) => `Pairing ${f.s1} with ${f.s2} tore the league apart.`, (f) => `${f.s1} and ${f.s2} were simply on another level.`],
  champ: [(f) => `${f.s1} and ${f.s2} dragged this side over the line.`, (f) => `When it mattered, ${f.s1} and ${f.s2} delivered.`],
  hunt: [(f) => `${f.s1} and ${f.s2} kept them in the hunt all season.`, (f) => `${f.s1} and ${f.s2} did their bit, and then some.`],
  lonely: [(f) => `${f.s1} carried the load, but too often looked lonely.`, (f) => `${f.s1} tried. Not enough others did.`],
  sink: [(f) => `Not even ${f.s1} could save this sinking ship.`, (f) => `${f.s1} was the only bright spot in a grim season.`],
};

// ───────────────────────────── draft remarks ─────────────────────────────

const REMARKS: Record<string, Voiced> = {
  secret: {
    pro: [(f) => `And don't ask me who ${f.dev} is. Nobody at the club will tell me.`],
    nerd: [(f) => `${f.dev}'s card isn't in any database I can find.`],
    hack: [(f) => `MYSTERY STAR! Who is ${f.dev}, and where did they come from?`],
    comm: [(f) => `And ${f.dev}! Who IS that? What a card!`],
  },
  primeFlop: {
    pro: [(f) => `${f.flop} was a Prime Icon in name only: ${f.flopGA} goals and assists.`],
    nerd: [(f) => `${f.flop}: Prime Icon price tag, ${f.flopGA} goal involvements. Poor value.`],
    hack: [(f) => `FLOP! Prime Icon ${f.flop} managed just ${f.flopGA} goals and assists.`],
    comm: [(f) => `${f.flop}, a Prime Icon, with just ${f.flopGA} goals and assists! Not their year!`],
  },
  bargain: {
    pro: [(f) => `The real hero was ${f.gem}, a ${f.gemOvr}-rated grafter who ${f.gemFeat}.`],
    nerd: [(f) => `Best value in the squad: ${f.gem}, rated ${f.gemOvr}, ${f.gemFeat}.`],
    hack: [(f) => `BARGAIN OF THE SEASON! ${f.gemOvr}-rated ${f.gem} ${f.gemFeat}.`],
    comm: [(f) => `And what about ${f.gem}! Rated just ${f.gemOvr} and ${f.gemFeat}!`],
  },
  mashup: {
    pro: [(f) => `${f.oldest} in the same side as ${f.newest}? Football's gone mad, and I love it.`],
    nerd: [(f) => `A ${f.span}-year gap between ${f.oldest} and ${f.newest}. Fascinating squad construction.`],
    hack: [(f) => `TIME TRAVEL! ${f.oldest} lining up next to ${f.newest}.`],
    comm: [(f) => `${f.oldest} and ${f.newest} in the same team! ${f.span} years apart!`],
  },
  oneClub: {
    pro: [(f) => `${f.clubN} of the XI from ${f.club}. Loyalty, or just lazy scouting?`],
    nerd: [(f) => `${f.clubN} of 11 starters from ${f.club}. The familiarity showed.`],
    hack: [(f) => `${f.club.toUpperCase()} REUNION! ${f.clubN} of their stars in one XI.`],
    comm: [(f) => `${f.clubN} ${f.club} players in one side! It's like a reunion!`],
  },
  misfit: {
    pro: [(f) => `Playing a ${f.role} at ${f.slotRole}? I'd have had words.`],
    nerd: [(f) => `Fielding a ${f.role} at ${f.slotRole} cost real chemistry points.`],
    hack: [(f) => `BLUNDER! A ${f.role} played at ${f.slotRole}.`],
    comm: [(f) => `A ${f.role} at ${f.slotRole}! Brave! Or mad!`],
  },
  noShield: {
    pro: [() => 'And no holding midfielder? The back four were hung out to dry.'],
    nerd: [() => 'No defensive midfielder meant the back four faced far too many shots.'],
    hack: [() => 'WIDE OPEN! No midfield shield in front of the back four.'],
    comm: [() => 'Nobody protecting the back four! Wide open!'],
  },
  chemistry: {
    pro: [(f) => `${f.chem}% chemistry: they played like they'd grown up together.`],
    nerd: [(f) => `${f.chem}% chemistry, and the passing networks showed it.`],
    hack: [(f) => `BAND OF BROTHERS! ${f.chem}% chemistry.`],
    comm: [(f) => `${f.chem}% chemistry! They know each other's game inside out!`],
  },
};

// ───────────────────────────── closers ─────────────────────────────

const CLOSERS: Record<Grade | 'champA', Voiced> = {
  'S+': {
    pro: [() => "Best side I've ever watched, and I've watched a few.", () => 'Frame the shirts. Teams like this come along once a generation.'],
    nerd: [() => "Statistically, this is the strongest season I've modelled.", () => "Every metric is off the charts. I'll need a bigger chart."],
    hack: [() => 'HISTORY MAKERS! Pundits have run out of superlatives.', () => "GREATEST EVER? Don't bet against it."],
    comm: [() => 'Remember where you were for this one!', () => 'Legends, the lot of them!'],
  },
  S: {
    pro: [() => 'Title won at a canter. Put the champagne on ice.', () => 'Champions with room to spare. The way it should be done.'],
    nerd: [() => 'A title margin comfortably above the average champion.', () => 'Champions, and the underlying numbers say it was fully deserved.'],
    hack: [() => 'CHAMPIONS! The parade bus is booked.', () => 'TITLE ROMP! Rivals are writing apology letters.'],
    comm: [() => 'Champions! Get the trophy out!', () => "They've won the league, and they've done it in style!"],
  },
  champA: {
    pro: [() => "Champions, and that's all anyone remembers.", () => "Not pretty at times, but the trophy doesn't care."],
    nerd: [() => 'Below-average points for a champion, but a title is a title.', () => 'The numbers say they were fortunate. The trophy says otherwise.'],
    hack: [() => "CHAMPIONS! The parade bus doesn't check the points total.", () => 'WE ARE THE CHAMPIONS! Never mind how.'],
    comm: [() => "Champions! It doesn't matter how!", () => "They've won it! Who cares about the margin!"],
  },
  A: {
    pro: [() => 'Close, but no cigar. Strengthen in the summer and go again.', () => 'So near. The board should be backing this manager.'],
    nerd: [() => 'A points total good enough to win plenty of seasons. Just not this one.', () => 'A top-three side by every measure. The gap to the top is small.'],
    hack: [() => 'SO CLOSE! The board are sanctioning a summer splurge.', () => 'NEARLY MEN! Glory slips through their fingers.'],
    comm: [() => 'So close to glory! Next year could be the one!', () => 'Champions League nights are coming!'],
  },
  B: {
    pro: [() => "Decent season. Not one I'd write a book about.", () => "Europe's a nice consolation, but the title was never on."],
    nerd: [() => 'A top-five finish, roughly in line with squad strength.', () => 'Solid numbers. One elite signing short of contention.'],
    hack: [() => 'EUROPE BECKONS! But the title chasers barely looked back.', () => 'NEARLY THERE! One big signing away from glory.'],
    comm: [() => 'European football is coming!', () => 'A good season! Next stop: the title race!'],
  },
  C: {
    pro: [() => 'Mid-table. Safe, steady and instantly forgotten.', () => 'Nothing to write home about. Nothing to cry about either.'],
    nerd: [() => 'Mid-table, exactly where the expected points put them.', () => 'A perfectly average season, statistically speaking.'],
    hack: [() => 'MEH! A season that sold very few calendars.', () => 'MID-TABLE MEDIOCRITY! Fans are yawning.'],
    comm: [() => 'Safe in mid-table! Next season, maybe more?', () => "Not one for the history books, but they're safe!"],
  },
  D: {
    pro: [() => 'The fans are singing about the board, and not kindly.', () => 'Played like a pub team on a Sunday morning.'],
    nerd: [() => 'Underperformed expected points by a wide margin.', () => 'On paper a top-half side. On grass, not so much.'],
    hack: [() => 'FANS FURIOUS! Questions must be asked.', () => 'WHAT A WASTE! Big names, small results.'],
    comm: [() => 'A season to forget! Back to the drawing board!', () => 'It just never clicked for them!'],
  },
  F: {
    pro: [() => 'Sacked in the morning, and rightly so.', () => "Relegation form. I've seen enough."],
    nerd: [() => "The worst return on talent I've ever recorded.", () => "Even my most pessimistic model didn't predict this."],
    hack: [() => 'SACKED IN THE MORNING! Fans have chartered a banner plane.', () => 'DOOMED! Pundits will be picking this apart for years.'],
    comm: [() => 'Disaster! Absolute disaster!', () => "A season they'll want to forget, and quickly!"],
  },
};

// ───────────────────────────── memory (no repeats) ─────────────────────────────

const MEMORY_KEY = 'pd38-scout-recent';
const MEMORY_SIZE = 40;
function recall(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(MEMORY_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function remember(keys: string[]) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify([...keys, ...recall()].slice(0, MEMORY_SIZE)));
  } catch {
    /* storage unavailable: repeats are allowed */
  }
}

// ───────────────────────────── helpers ─────────────────────────────

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const seasonYear = (season: string) => {
  const yy = parseInt(season.slice(0, 2), 10);
  return yy >= 90 ? 1900 + yy : 2000 + yy;
};
const ROLE: Record<string, string> = {
  GK: 'goalkeeper', CB: 'centre-back', RB: 'right-back', LB: 'left-back', CDM: 'holding midfielder', CM: 'central midfielder',
  CAM: 'No.10', RM: 'right midfielder', LM: 'left midfielder', RW: 'right winger', LW: 'left winger', ST: 'striker',
};
const roleName = (pos: string) => ROLE[pos] ?? pos;
const cardLabel = (c: PlayerCard) => `${c.season} ${c.era === 'PRIME' ? 'Prime ' : c.era === 'LEGEND' ? 'Legend ' : ''}${c.shortName}`;
const gapText = (pts: number, gd: number) => (pts === 0 ? (gd === 0 ? 'goals scored' : 'goal difference') : pts === 1 ? 'a single point' : `${pts} points`);

/** Each club's league position after every matchweek (index 0 = after MW1), using the table's tie-breaks. */
function positionHistory(sim: SeasonSim, teamId: string): number[] {
  const rows: Record<string, { pts: number; gd: number; gf: number; name: string }> = {};
  sim.teams.forEach((t) => (rows[t.id] = { pts: 0, gd: 0, gf: 0, name: t.name }));
  const out: number[] = [];
  sim.results.forEach((round) => {
    round.forEach((r) => {
      const h = rows[r.homeId];
      const a = rows[r.awayId];
      h.gf += r.homeGoals;
      a.gf += r.awayGoals;
      h.gd += r.homeGoals - r.awayGoals;
      a.gd += r.awayGoals - r.homeGoals;
      if (r.homeGoals > r.awayGoals) h.pts += 3;
      else if (r.homeGoals < r.awayGoals) a.pts += 3;
      else (h.pts += 1), (a.pts += 1);
    });
    const order = Object.entries(rows).sort(([, x], [, y]) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name));
    out.push(order.findIndex(([id]) => id === teamId) + 1);
  });
  return out;
}

// ───────────────────────────── the verdict ─────────────────────────────

export interface VerdictInput {
  sim: SeasonSim;
  userTeamId: string;
  formationId: FormationId;
  lineup: Lineup;
  rating: TeamRating;
  grade: Grade;
  position: number;
  record: TableRow;
  table: TableRow[];
  userStats: PlayerSeasonStats[];
  bestStreak: number;
}

export function scoutVerdict(inp: VerdictInput): { verdict: string; scout: Scout } {
  const { sim, userTeamId, formationId, lineup, rating, grade, position, record, table, userStats, bestStreak } = inp;
  const rng = sim.rng;
  const recent = new Set(recall());
  const formation = FORMATIONS[formationId];
  const played = Math.max(1, record.played);

  // Scout: random, but not the same one as last time.
  const lastScout = [...recent].find((k) => k.startsWith('scout:'))?.slice(6);
  const scoutPool = SCOUT_IDS.filter((s) => s !== lastScout);
  const scout = SCOUTS[scoutPool[Math.floor(rng() * scoutPool.length)]];

  const placed = formation.slots.map((s) => ({ slot: s, card: lineup[s.id] })).filter((x) => x.card) as { slot: (typeof formation.slots)[number]; card: PlayerCard }[];
  const statOf = (c: PlayerCard) => sim.stats[c.id] ?? { goals: 0, assists: 0, cleanSheets: 0, apps: 0, ratingSum: 0 };
  const involvement = (c: PlayerCard) => statOf(c).goals + statOf(c).assists;
  const stars = [...placed].sort((a, b) => statOf(b.card).goals + statOf(b.card).assists * 0.7 - (statOf(a.card).goals + statOf(a.card).assists * 0.7));

  const f = { pos: ordinal(position), pts: record.points, w: record.won, d: record.drawn, l: record.lost, gf: record.gf, ga: record.ga } as Facts;
  f.s1 = stars[0] ? cardLabel(stars[0].card) : 'your best player';
  f.s2 = stars[1] ? cardLabel(stars[1].card) : 'the supporting cast';
  f.eraName = sim.era.name;

  // ── candidate openers, scored by how remarkable they are
  const angles: { id: string; score: number }[] = [];
  const add = (id: string, score: number) => angles.push({ id, score });
  const hist = positionHistory(sim, userTeamId);
  const other = position === 1 ? table[1] : table[0];
  const ptsGap = other ? Math.abs(record.points - other.points) : 99;
  const gdGap = other ? Math.abs(record.gf - record.ga - (other.gf - other.ga)) : 99;
  f.gap = gapText(ptsGap, gdGap);

  if (record.lost === 0 && record.drawn === 0) add('perfect', 10);
  else if (record.lost === 0) add('invincible', 8);
  if (position === 1 && hist.length >= 30) {
    const lastNotTop = hist.reduce((acc, p, i) => (p !== 1 ? i : acc), -1);
    if (lastNotTop <= 5) {
      f.fromMw = lastNotTop + 2;
      f.weeksTop = hist.filter((p) => p === 1).length;
      add('wireToWire', 3);
    }
  }
  if (position === 1 && ptsGap <= 2) add('lastDay', 3.4 - ptsGap * 0.3);
  if (position === 2 && ptsGap <= 3) add('pipped', 3.2 - ptsGap * 0.3);
  const lastTop = hist.reduce((acc, p, i) => (p === 1 ? i : acc), -1);
  if (position >= 3 && lastTop >= 23) {
    f.lastTopMw = lastTop + 1;
    add('collapse', 3.5);
  }
  const mid = hist[18];
  if (mid !== undefined && mid >= 9 && position <= 4) {
    f.midPos = ordinal(mid);
    add('climb', 3 + (mid - position) * 0.05);
  }
  if (position >= 16) add('bottom', 2.4);
  if (record.gf >= 75 && record.ga >= 45) add('leaky', 2.6);
  if (record.ga <= 22) {
    f.gaPer = (record.ga / played).toFixed(2);
    add('fortress', 2.4 + (22 - record.ga) * 0.08);
  }
  const top = [...userStats].sort((a, b) => b.goals - a.goals)[0];
  if (top) {
    f.scorer = top.name;
    f.goals = top.goals;
    f.share = record.gf ? Math.round((top.goals / record.gf) * 100) : 0;
    f.rest = record.gf - top.goals;
    if (top.goals >= 28) add('goalMachine', 2.6 + (top.goals - 28) * 0.06);
    if (top.goals >= 15 && record.gf >= 30 && f.share >= 38) add('oneManTeam', 2.4 + (f.share - 38) * 0.03);
  }
  const gkSlot = formation.slots.find((s) => s.label === 'GK');
  const gkCard = gkSlot ? lineup[gkSlot.id] : null;
  const gk = gkCard ? userStats.find((s) => s.id === gkCard.id) : undefined;
  if (gk && gk.cleanSheets >= 17) {
    f.gk = gk.name;
    f.cs = gk.cleanSheets;
    f.csPct = Math.round((gk.cleanSheets / played) * 100);
    add('keeper', 2.4 + (gk.cleanSheets - 17) * 0.08);
  }
  if (bestStreak >= 9) {
    f.streak = bestStreak;
    add('winStreak', 2.4 + (bestStreak - 9) * 0.1);
  }
  let run = 0;
  let worstRun = 0;
  sim.results.forEach((round) => {
    const r = round.find((x) => x.homeId === userTeamId || x.awayId === userTeamId);
    if (!r) return;
    const diff = r.homeId === userTeamId ? r.homeGoals - r.awayGoals : r.awayGoals - r.homeGoals;
    run = diff > 0 ? 0 : run + 1;
    worstRun = Math.max(worstRun, run);
  });
  if (worstRun >= 8) {
    f.winless = worstRun;
    add('winless', 2.5 + (worstRun - 8) * 0.1);
  }
  if (record.drawn >= 14) {
    f.lostPts = record.drawn * 2;
    add('draws', 2.5);
  }
  const signing = sim.transfers[0];
  const signed = signing && userStats.find((s) => s.name === signing.inName);
  if (signed && signed.goals + signed.assists >= 5) {
    f.signing = signed.name;
    f.sga = signed.goals + signed.assists;
    add('signing', 2.2);
  }
  if (sim.shouts.length >= 3) {
    f.calls = sim.shouts.length;
    f.callsWon = sim.shouts.filter((s) => s.result === 'W').length;
    f.callsLost = sim.shouts.filter((s) => s.result === 'L').length;
    f.winPct = Math.round((f.callsWon / f.calls) * 100);
    const attacks = sim.shouts.filter((s) => s.shout === 'attack').length;
    if (f.callsLost / f.calls >= 0.5 && attacks >= 2) add('gambler', 2);
    else if (f.callsWon / f.calls >= 0.66) add('shrewd', 2);
  }
  add('era', 0.8);
  add('stars', 1.3);

  // Pick the most remarkable angle, with a little randomness so close calls vary. Skip angles used last time.
  const lastAngle = [...recent].find((k) => k.startsWith('angle:'))?.slice(6);
  const chosen = angles
    .map((a) => ({ ...a, s: a.score + rng() * 0.9 - (a.id === lastAngle && a.score < 8 ? 1 : 0) }))
    .sort((a, b) => b.s - a.s)[0].id;

  const used: string[] = [`scout:${scout.id}`, `angle:${chosen}`];
  const choose = (key: string, lines: Line[]) => {
    const fresh = lines.map((_, i) => i).filter((i) => !recent.has(`${key}:${i}`));
    const pool = fresh.length ? fresh : lines.map((_, i) => i);
    const i = pool[Math.floor(rng() * pool.length)];
    used.push(`${key}:${i}`);
    return lines[i](f);
  };

  let opener: string;
  if (chosen === 'stars') {
    const kind = grade === 'S+' || grade === 'S' ? 'top' : grade === 'A' && position === 1 ? 'champ' : grade === 'A' || grade === 'B' ? 'hunt' : grade === 'C' || grade === 'D' ? 'lonely' : 'sink';
    opener = choose(`stars-${kind}`, STAR_OPENERS[kind]);
  } else {
    opener = choose(`o-${chosen}-${scout.id}`, OPENERS[chosen][scout.id]);
  }

  // ── draft remark: the most interesting thing about the cards you picked (sometimes nothing)
  const remarks: { id: string; score: number; who?: string }[] = [];
  const dev = placed.find((p) => p.card.tier === 'SECRET_DEV');
  if (dev) {
    f.dev = dev.card.name;
    remarks.push({ id: 'secret', score: 4, who: dev.card.shortName });
  }
  const flop = placed
    .filter((p) => p.card.tier === 'PRIME_ICON' && p.card.positions[0] !== 'GK' && positionGroup(p.card.positions[0]) !== 'DEF' && statOf(p.card).apps >= 15)
    .sort((a, b) => involvement(a.card) - involvement(b.card))[0];
  if (flop && involvement(flop.card) <= 4) {
    f.flop = cardLabel(flop.card);
    f.flopGA = involvement(flop.card);
    remarks.push({ id: 'primeFlop', score: 2.6, who: flop.card.shortName });
  }
  const outfield = placed.filter((p) => p.card.positions[0] !== 'GK');
  const topScorer = [...outfield].sort((a, b) => statOf(b.card).goals - statOf(a.card).goals)[0];
  const topInvolved = [...outfield].sort((a, b) => involvement(b.card) - involvement(a.card))[0];
  // A bargain: clearly one of the weaker cards in the XI, but the team's main source of goals.
  const avgOvr = placed.reduce((t, p) => t + p.card.ovr, 0) / Math.max(1, placed.length);
  const gem = [topScorer, topInvolved].find((p) => p && p.card.ovr <= Math.min(80, avgOvr - 3) && involvement(p.card) >= 12);
  if (gem) {
    f.gem = cardLabel(gem.card);
    f.gemOvr = gem.card.ovr;
    f.gemFeat =
      gem === topScorer && statOf(gem.card).goals > 0
        ? `finished as the team's top scorer with ${statOf(gem.card).goals}`
        : `led the team with ${involvement(gem.card)} goals and assists`;
    remarks.push({ id: 'bargain', score: 2.5, who: gem.card.shortName });
  }
  const bySeason = [...placed].sort((a, b) => seasonYear(a.card.season) - seasonYear(b.card.season));
  if (bySeason.length >= 2) {
    const span = seasonYear(bySeason[bySeason.length - 1].card.season) - seasonYear(bySeason[0].card.season);
    if (span >= 20) {
      f.oldest = cardLabel(bySeason[0].card);
      f.newest = cardLabel(bySeason[bySeason.length - 1].card);
      f.span = span;
      remarks.push({ id: 'mashup', score: 1.4 + (span - 20) * 0.04 });
    }
  }
  const clubCounts: Record<string, number> = {};
  placed.forEach((p) => p.card.club !== 'DEV' && (clubCounts[p.card.club] = (clubCounts[p.card.club] ?? 0) + 1));
  const [bigClub, bigN] = Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (bigN >= 5) {
    f.club = getClub(bigClub).name;
    f.clubN = bigN;
    remarks.push({ id: 'oneClub', score: 2 + (bigN - 5) * 0.2 });
  }
  const worstFit = rating.fits.filter((x) => x.fit === 'oop' || x.fit === 'adjacent').sort((a, b) => b.penalty - a.penalty)[0];
  const misfit = worstFit ? placed.find((p) => p.slot.id === worstFit.slotId) : undefined;
  if (misfit && worstFit.fit === 'oop') {
    f.role = roleName(misfit.card.positions[0]);
    f.slotRole = roleName(misfit.slot.label);
    remarks.push({ id: 'misfit', score: 2.2 });
  }
  if (rating.balanceNote && rating.balancePenalty > 0) remarks.push({ id: 'noShield', score: 1.8 });
  if (rating.chemistry >= 85) {
    f.chem = rating.chemistry;
    remarks.push({ id: 'chemistry', score: 1.2 });
  }
  // Don't name the same player twice.
  const remark = remarks.filter((r) => !r.who || !opener.includes(r.who)).map((r) => ({ ...r, s: r.score + rng() * 0.8 })).sort((a, b) => b.s - a.s)[0];
  // Leave the remark out now and then, so verdicts vary in length too (but never hide a secret rare).
  const remarkText = remark && (remark.id === 'secret' || rng() < 0.8) ? choose(`r-${remark.id}-${scout.id}`, REMARKS[remark.id][scout.id]) : '';

  const closerKey = grade === 'A' && position === 1 ? 'champA' : grade;
  const closer = choose(`c-${closerKey}-${scout.id}`, CLOSERS[closerKey][scout.id]);

  remember(used);
  return { verdict: [opener, remarkText, closer].filter(Boolean).join(' '), scout };
}
