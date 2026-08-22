import { describe, expect, it } from 'vitest';
import { translateDirection, translateRecommendation } from '@/app/(dashboard)/lib/i18n';

// design.md "One i18n module, presentational-only, lookup tables not switch
// statements": one assertion per Record key — cheap, catches missing-key
// typos TS's exhaustiveness check wouldn't catch (string content, not type).

describe('translateRecommendation', () => {
  it('BUY -> Compra', () => {
    expect(translateRecommendation('BUY')).toBe('Compra');
  });

  it('SELL -> Venta', () => {
    expect(translateRecommendation('SELL')).toBe('Venta');
  });

  it('NO_RECOMMENDATION -> Sin recomendación', () => {
    expect(translateRecommendation('NO_RECOMMENDATION')).toBe('Sin recomendación');
  });
});

describe('translateDirection', () => {
  it('ALL -> Todos', () => {
    expect(translateDirection('ALL')).toBe('Todos');
  });

  it('BUY -> Compra', () => {
    expect(translateDirection('BUY')).toBe('Compra');
  });

  it('SELL -> Venta', () => {
    expect(translateDirection('SELL')).toBe('Venta');
  });

  it('NO_RECOMMENDATION -> Sin recomendación', () => {
    expect(translateDirection('NO_RECOMMENDATION')).toBe('Sin recomendación');
  });
});
