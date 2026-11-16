import type { DevSceneId } from '../components/DevScene';

/**
 * Personal themes for the secret dev cards, keyed by Player ID.
 * - scene: the background drawn behind the portrait
 * - banner / emoji: replace the season + era badge (emoji alone on tiny cards)
 * - fanClub: the portrait wears this club's kit, and the card says "<club> fan"
 */
export interface DevTheme {
  scene: DevSceneId;
  banner: string;
  emoji: string;
  fanClub: string;
  fanLabel: string;
}

export const DEV_THEMES: Record<string, DevTheme> = {
  brockley_louis: { scene: 'golf', banner: 'HOLE IN ONE', emoji: '⛳', fanClub: 'MCI', fanLabel: 'Man City fan' },
  truman_paul: { scene: 'pizza', banner: 'EXTRA PEPPERONI', emoji: '🍕', fanClub: 'MUN', fanLabel: 'Man United fan' },
  salisbury_ashley: { scene: 'pub', banner: 'LAST ORDERS', emoji: '🍺', fanClub: 'MCI', fanLabel: 'Man City fan' },
  dolan_ryan: { scene: 'monster', banner: 'WILD ENCOUNTER', emoji: '🌿', fanClub: 'AVL', fanLabel: 'Aston Villa fan' },
};

export const devTheme = (basePlayerId: string): DevTheme | undefined => DEV_THEMES[basePlayerId];
