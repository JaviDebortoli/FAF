import type { Recommendation } from '@/src/domain/types';
import type { Direction } from './select';

/**
 * design.md "One i18n module, presentational-only, lookup tables not switch
 * statements" (no-recommendation-filter-and-i18n): every presentational
 * component sources its Spanish display text from here instead of rendering
 * the raw English literal. `Record<T, string>` is exhaustively type-checked
 * against the union — a missing key is a compile error, unlike a ternary
 * chain. Confirmed terminology: BUY -> "Compra", SELL -> "Venta",
 * NO_RECOMMENDATION -> "Sin recomendación", ALL -> "Todos".
 */
const RECOMMENDATION_ES: Record<Recommendation, string> = {
  BUY: 'Compra',
  SELL: 'Venta',
  NO_RECOMMENDATION: 'Sin recomendación',
};

const DIRECTION_ES: Record<Direction, string> = {
  ALL: 'Todos',
  ...RECOMMENDATION_ES,
};

export function translateRecommendation(recommendation: Recommendation): string {
  return RECOMMENDATION_ES[recommendation];
}

export function translateDirection(direction: Direction): string {
  return DIRECTION_ES[direction];
}
