import type { CaricatureTraits, KitDesign } from '../types/game';
const k = (body: string, sleeve: string, collar: string, collarStyle: KitDesign['collarStyle'], pattern: KitDesign['pattern'] = 'plain', patternColor = '#fff', gk = false): KitDesign => ({
  body, sleeve, collar, trim: collar, collarStyle, pattern, patternColor, bands: 7, piping: false,
  badge: { shape: 'shield', fill: '#ffffff', band: body }, maker: { mark: 'chevron', color: collar }, gk,
});
export const FLOW8: { traits: CaricatureTraits; kit: KitDesign }[] = [
  { traits: { skinTone: 'pale', hairStyle: 'short', hairColor: 'blonde', facialHair: 'none', headShape: 'long', expression: 'calm', accessory: 'headband', eyes: 'dot', nose: 'long', detail: 'plaster' }, kit: k('#c8202f', '#ffffff', '#ffffff', 'polo') },
  { traits: { skinTone: 'brown', hairStyle: 'dreads', hairColor: 'black', facialHair: 'stubble', headShape: 'oval', expression: 'smirk', accessory: 'none', eyes: 'heavy' }, kit: k('#8fc3ea', '#8fc3ea', '#ffffff', 'polo') },
  { traits: { skinTone: 'deep', hairStyle: 'bald', hairColor: 'black', facialHair: 'fullbeard', headShape: 'round', expression: 'roar', accessory: 'none', nose: 'bulbous', detail: 'nosestrip' }, kit: k('#151515', '#151515', '#ffffff', 'v', 'stripes', '#f4f4f4') },
  { traits: { skinTone: 'dark', hairStyle: 'fade', hairColor: 'black', facialHair: 'beard', headShape: 'square', expression: 'determined', accessory: 'none', eyes: 'narrow', detail: 'scar' }, kit: k('#7a2338', '#93c4e8', '#93c4e8', 'v') },
  { traits: { skinTone: 'brown', hairStyle: 'afro', hairColor: 'darkbrown', facialHair: 'none', headShape: 'round', expression: 'tongue', accessory: 'sweatband', eyes: 'wide', nose: 'button' }, kit: k('#1d2a5a', '#1d2a5a', '#ffffff', 'polo') },
  { traits: { skinTone: 'light', hairStyle: 'long', hairColor: 'brown', facialHair: 'goatee', headShape: 'long', expression: 'cool', accessory: 'none', eyes: 'heavy', nose: 'long' }, kit: k('#c8202f', '#c8202f', '#f2c230', 'v') },
  { traits: { skinTone: 'brown', hairStyle: 'fade', hairColor: 'black', facialHair: 'none', headShape: 'oval', expression: 'focused', accessory: 'none', eyes: 'narrow' }, kit: k('#8fc3ea', '#8fc3ea', '#1d2a5a', 'crew') },
  { traits: { skinTone: 'dark', hairStyle: 'shavedline', hairColor: 'black', facialHair: 'goatee', headShape: 'heart', expression: 'grin', accessory: 'none', detail: 'gaptooth' }, kit: k('#2f7d3a', '#2f7d3a', '#14301a', 'crew', 'plain', '#fff', true) },
];
