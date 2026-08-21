import type { SVGProps } from 'react';

/**
 * `market-nav-redesign` design.md "Icons" — hand-sourced inline SVG icon set,
 * one per sidebar market (`lib/markets.ts`'s `Market.icon` field) plus the
 * mobile drawer's hamburger/close controls (Phase 4/PR4 wires `Menu`/`Close`
 * into `Sidebar.tsx`; grouped here per design.md so every icon shares one
 * file/import surface). All 24×24 viewBox, `fill="none"` + `stroke="currentColor"`
 * so icons inherit the active/inactive link color for free — no package or
 * CDN dependency (proposal.md decision 10 / spec.md "No new third-party
 * CDN/font dependency").
 */
type IconProps = SVGProps<SVGSVGElement>;

const DEFAULTS = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function TrendingUp(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}

export function Coins(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <circle cx="9" cy="9" r="6" />
      <path d="M14.5 8.5A6 6 0 1 1 8.5 14.5" />
    </svg>
  );
}

export function Bank(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M4 10h16" />
      <path d="M4 21h16" />
      <path d="M6 10v11" />
      <path d="M18 10v11" />
      <path d="M10 10v11" />
      <path d="M14 10v11" />
      <path d="M3 10 12 4l9 6" />
    </svg>
  );
}

export function Swap(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M4 8h13" />
      <polyline points="14 4 17 8 14 12" />
      <path d="M20 16H7" />
      <polyline points="10 12 7 16 10 20" />
    </svg>
  );
}

export function Box(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function BarChart(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M4 21V10" />
      <path d="M11 21V4" />
      <path d="M18 21v-7" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function PieChart(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M12 3v9l7.5 4.3" />
      <path d="M20.9 13A9 9 0 1 1 12 3" />
    </svg>
  );
}

export function Receipt(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

export function DollarSign(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M12 2v20" />
      <path d="M16.5 7a3.5 3.5 0 0 0-3.5-2h-1a3.5 3.5 0 0 0 0 7h1a3.5 3.5 0 0 1 0 7h-1a3.5 3.5 0 0 1-3.5-2" />
    </svg>
  );
}

export function Lock(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function Menu(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

export function Close(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

/**
 * `inicio-home-section` design.md "Interfaces / Contracts" — hand-drawn Home
 * icon for the new `InicioLink` sidebar entry (`Sidebar.tsx`), following this
 * file's existing convention (no package/CDN dependency).
 */
export function Home(props: IconProps) {
  return (
    <svg {...DEFAULTS} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

export const Icons = {
  TrendingUp,
  Coins,
  Bank,
  Swap,
  Box,
  BarChart,
  PieChart,
  Receipt,
  DollarSign,
  Lock,
  Menu,
  Close,
  Home,
};
