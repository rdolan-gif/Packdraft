// Nation flags (flag-icons, MIT licence) with an ink border so they sit in the toon style.
const FILES = import.meta.glob('./flags/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const NATION_ISO: Record<string, string> = {
  England: 'gb-eng', France: 'fr', 'Republic of Ireland': 'ie', Brazil: 'br', Spain: 'es', Netherlands: 'nl', Wales: 'gb-wls',
  Scotland: 'gb-sct', Portugal: 'pt', Belgium: 'be', Argentina: 'ar', Denmark: 'dk', Nigeria: 'ng', Norway: 'no', Germany: 'de',
  Sweden: 'se', Jamaica: 'jm', Italy: 'it', "Côte d'Ivoire": 'ci', 'United States': 'us', 'Northern Ireland': 'gb-nir', Ghana: 'gh',
  Australia: 'au', Serbia: 'rs', Senegal: 'sn', Colombia: 'co', 'South Africa': 'za', Iceland: 'is', Finland: 'fi', Poland: 'pl',
  'New Zealand': 'nz', 'Korea Republic': 'kr', Ecuador: 'ec', 'DR Congo': 'cd', Croatia: 'hr', Austria: 'at', Uruguay: 'uy',
  Turkey: 'tr', Switzerland: 'ch', Russia: 'ru', Mexico: 'mx', Japan: 'jp', Hungary: 'hu', Honduras: 'hn', Greece: 'gr', Egypt: 'eg',
  'Czech Republic': 'cz', Cameroon: 'cm', Bulgaria: 'bg', 'Bosnia and Herzegovina': 'ba', Algeria: 'dz', Venezuela: 've',
  'Trinidad and Tobago': 'tt', Slovakia: 'sk', Peru: 'pe', Paraguay: 'py', Oman: 'om', Morocco: 'ma', Kenya: 'ke', Grenada: 'gd',
  Georgia: 'ge', Gabon: 'ga', Chile: 'cl', Bermuda: 'bm', Barbados: 'bb',
};

export function Flag({ nation, height = 14 }: { nation: string; height?: number }) {
  const iso = NATION_ISO[nation];
  const src = iso && FILES[`./flags/${iso}.svg`];
  if (!src) return <span style={{ fontSize: height * 0.7 }}>{nation}</span>;
  return (
    <img src={src} alt={nation} title={nation} width={(height * 4) / 3} height={height}
      style={{ display: 'inline-block', maxWidth: 'none', border: '1.5px solid #161c2b', borderRadius: 2, verticalAlign: 'middle', boxShadow: '1.5px 1.5px 0 #161c2b' }} />
  );
}
