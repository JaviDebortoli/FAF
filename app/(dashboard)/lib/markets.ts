/**
 * `market-nav-redesign` design.md "Route Structure" / "Component Contracts" —
 * single config source for both the sidebar nav (`Sidebar.tsx`) and the
 * placeholder-route lookup (PR3's `[market]/page.tsx`). Grouping/order MUST
 * match `specs/market-navigation/spec.md`'s corrected "Sidebar navigation
 * shell" requirement exactly: "MERCADOS PRINCIPALES" (7 items, NO CEDEARs)
 * then "MERCADO ARGENTINO" (3 items, CEDEARs first).
 *
 * `icon` is typed as `keyof typeof Icons` (Phase 2/PR2, task 2.4/2.5) now
 * that `components/icons.tsx` exists — tightened from PR1's `string`
 * placeholder (see PR1's apply-progress "Deviation — Market.icon field
 * type"); the icon names below were already correct, this is a type-only
 * change.
 */
import type { Icons } from '../components/icons';

export interface Market {
  slug: string;
  label: string;
  /** Icon component name — must be a key of `Icons` (`components/icons.tsx`). */
  icon: keyof typeof Icons;
  /** True only for `crypto` — the sole market with real backend data. Every
   * other market renders PR3's shared "próximamente" placeholder. */
  isReal: boolean;
}

export interface MarketGroup {
  label: string;
  slugs: string[];
}

export const MARKETS: Record<string, Market> = {
  acciones: { slug: 'acciones', label: 'Acciones', icon: 'TrendingUp', isReal: false },
  crypto: { slug: 'crypto', label: 'Criptomonedas', icon: 'Coins', isReal: true },
  'renta-fija': { slug: 'renta-fija', label: 'Renta Fija', icon: 'Bank', isReal: false },
  forex: { slug: 'forex', label: 'Forex', icon: 'Swap', isReal: false },
  commodities: { slug: 'commodities', label: 'Commodities', icon: 'Box', isReal: false },
  indices: { slug: 'indices', label: 'Índices', icon: 'BarChart', isReal: false },
  etfs: { slug: 'etfs', label: 'ETFs', icon: 'PieChart', isReal: false },
  cedears: { slug: 'cedears', label: 'CEDEARs', icon: 'Receipt', isReal: false },
  dolar: { slug: 'dolar', label: 'Dólar y Cotizaciones', icon: 'DollarSign', isReal: false },
  'plazo-fijo': { slug: 'plazo-fijo', label: 'Plazo Fijo y Locales', icon: 'Lock', isReal: false },
};

export const MARKET_GROUPS: MarketGroup[] = [
  {
    label: 'MERCADOS PRINCIPALES',
    slugs: ['acciones', 'crypto', 'renta-fija', 'forex', 'commodities', 'indices', 'etfs'],
  },
  {
    label: 'MERCADO ARGENTINO',
    slugs: ['cedears', 'dolar', 'plazo-fijo'],
  },
];
