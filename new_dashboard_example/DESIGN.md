---
name: Deterministic Financial Intelligence
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ffb2b7'
  on-secondary: '#67001b'
  secondary-container: '#b50036'
  on-secondary-container: '#ffc2c4'
  tertiary: '#c0c1ff'
  on-tertiary: '#1000a9'
  tertiary-container: '#9699ff'
  on-tertiary-container: '#1d17b2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000d'
  on-secondary-fixed-variant: '#92002a'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
  bg-deep: '#0A0B0D'
  surface-card: '#16191E'
  border-subtle: '#2D323B'
  text-primary: '#F8FAFC'
  text-secondary: '#94A3B8'
  text-muted: '#475569'
  buy-accent: '#10B981'
  sell-accent: '#F43F5E'
  warning-theta: '#F59E0B'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is rooted in the "Fintech High-End" aesthetic, prioritizing precision, institutional trust, and deterministic transparency. It moves away from flashy consumer-grade trends toward a more rigorous, academic-professional environment suitable for high-stakes decision-making.

The visual style is a blend of **Corporate Modern** and **Minimalism**, characterized by:
- A "Deep Dark" default mode to reduce visual fatigue during long analysis sessions.
- High-contrast functional accents (Emerald for Buy, Coral for Sell) that serve as immediate cognitive triggers.
- An airy, structured layout that prevents data density from becoming visual clutter.
- A technical narrative reinforced by mathematical notation and clean, monospaced-adjacent typography.

## Colors

This design system uses a dark-first palette to establish a sophisticated, high-end fintech environment. 

- **Primary (Emerald):** Reserved strictly for positive "BUY" signals, success states, and growth indicators.
- **Secondary (Coral):** Reserved for "SELL" signals, negative trends, or critical alerts.
- **Neutral:** A range of Slate and Pizarra grays. The background is a deep, near-black (`#0A0B0D`), while UI surfaces use slightly lighter shades to create depth without relying on heavy shadows.
- **Typography:** Uses "Off-White" (White Roto) for primary readability and Slate for secondary metadata to maintain a clear visual hierarchy and reduce eye strain.

## Typography

Typography is used to distinguish between narrative content and technical data. **Inter** is the primary typeface for its exceptional legibility in dark interfaces. 

- **Headlines:** Use tighter letter-spacing and heavier weights to anchor sections.
- **Data Points:** For Greek symbols (σ, γ, ρ) and numerical values (θ = 0.67), use a monospaced font or the `mono-data` token to ensure alignment and technical clarity.
- **Hierarchy:** Primary titles use White Roto (`#F8FAFC`), while supporting instructional text uses Slate (`#94A3B8`).

## Layout & Spacing

The design system utilizes a **Fixed Grid** approach for the main dashboard area, centering content to maintain a professional, controlled feel. 

- **Grid Model:** A 12-column system with 24px (1.5rem) gutters. 
- **Card Distribution:** Financial recommendation cards typically span 4 columns on desktop (3 per row), 6 columns on tablet, and 12 columns on mobile.
- **Rhythm:** A strict 8px base unit ensures consistent vertical rhythm.
- **Density:** High whitespace (stack-lg) between the header and the recommendation grid to allow the user to focus on the "Decision Framework" narrative before diving into specific assets.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than traditional drop shadows. This maintains the sleek, modern fintech look.

- **Base Layer:** The deepest neutral (`#0A0B0D`) for the global background.
- **Surface Layer:** Cards use a subtle elevation shift to `#16191E` with a 1px solid border (`#2D323B`) to define boundaries.
- **Interactive Depth:** On hover, cards transition their border color to a slightly brighter gray or a muted primary tint, and a very soft, large-radius ambient glow (opacity < 10%) can be applied to simulate light emanating from the card.
- **Backdrop Blurs:** Used exclusively for navigation bars or modal overlays to maintain context while focusing on specific decision inputs.

## Shapes

The design system uses "Rounded" (0.5rem) geometry. This specific radius provides a professional balance—soft enough to feel modern and accessible, but sharp enough to retain a sense of mathematical precision.

- **Small Elements (Chips/Tags):** 0.5rem (rounded).
- **Medium Elements (Cards/Inputs):** 1rem (rounded-lg).
- **Large Elements (Modals/Banners):** 1.5rem (rounded-xl).

## Components

### Cards (Recommendations)
The core component. Each card must feature:
- A header with the asset pair (e.g., XRP/USDT) and a status Chip (BUY/SELL).
- A central "Gauge" visualization with high-contrast needles.
- A subtle "Trend Sparkline" at the bottom to show historical context.
- Mathematical metadata (Gap, Theta) aligned to the bottom corners in monospaced type.

### Buttons & Interaction
- **Primary Action:** Solid background using the accent color (Green/Red) with high-contrast text.
- **Secondary/Ghost:** 1px border with no fill, becoming semi-transparent on hover.
- **Hover States:** Soft transitions (200ms) for border color and background luminosity.

### Chips
Small, high-contrast labels for "BUY" and "SELL". These use a semi-transparent background of the accent color (e.g., Emerald at 15% opacity) with a solid Emerald text and a 1px solid border of the same color to ensure they "pop" against the dark card surface.

### Inputs
Dark-themed text fields with a 1px border. The focus state uses a 2px Emerald border to signify active engagement with the decision engine.

### Gauges & Lines
Needles and lines must be thin (1.5px - 2px) to look precise. The "Theta" indicator on gauges should be highlighted in Warning Gold (`#F59E0B`) to indicate the decision threshold.