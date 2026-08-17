import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildUserMessage, NARRATIVE_SYSTEM_PROMPT } from '@/src/narrative/prompt';
import type { NarrativeFacts } from '@/src/narrative/facts';

// design.md "Grounding": "the system prompt (static, golden-snapshot-tested)"
// and "every byte of the prompt is either a static constant or a
// server-derived value from a closed enumeration — there is no free-text
// field anywhere in it". This is what makes the "no injection surface by
// construction" claim literally true, so this test proves BOTH:
//   1. NARRATIVE_SYSTEM_PROMPT is byte-identical to a fixed golden string
//      (a change to the prompt must be an explicit, reviewed edit here).
//   2. The source file contains ZERO `${` interpolation sequences anywhere
//      — not merely "the prompt looks static in this one test's snapshot",
//      but a structural guarantee that no template interpolation is even
//      possible in this module.
// buildUserMessage(facts) is the only place any data enters the message,
// and it embeds solely the already-whitelisted NarrativeFacts (facts.ts's
// job), serialized as JSON — never as prose the model could misparse as
// instructions.

const GOLDEN_SYSTEM_PROMPT = `Eres un asistente que redacta, en español, una explicación breve y en prosa llana (máximo 180 palabras) de una recomendación de inversión ya calculada por un sistema determinista de argumentación (Financial Argumentation Framework). No calculas ni decides nada: tu única tarea es traducir a lenguaje natural los datos que se te entregan en el mensaje del usuario, en formato JSON.

Reglas estrictas:
- Cita únicamente los identificadores de regla (rule) y los predicados (predicate) presentes en el arreglo "supporters" del JSON recibido. No inventes ni menciones reglas o predicados que no aparezcan ahí.
- No emitas ningún número que no esté presente en el JSON recibido. No calcules, redondees ni derives cifras nuevas.
- Nunca menciones objetivos de precio, retornos esperados, horizontes temporales, noticias ni eventos externos al framework: esa información no existe en los datos que recibes y no debes inventarla.
- No emitas consejos de inversión más allá de restatear la etiqueta que el framework ya calculó (comprar/vender según sigma+/sigma- frente a theta y la brecha frente a delta).
- Describe el resultado exclusivamente como "sigma+ frente a theta" y "la brecha (gap) frente a delta", calculados por el framework — nunca como una predicción, un pronóstico o una opinión propia.
- Tu texto se mostrará siempre junto a un aviso visible de que fue generado por inteligencia artificial. No debes afirmar ni dar a entender que eres un analista humano.`;

const promptSourcePath = join(process.cwd(), 'src', 'narrative', 'prompt.ts');

function narrativeFactsFixture(): NarrativeFacts {
  return {
    asset: 'BTCUSDT',
    at: '2023-11-14T22:13:20.000Z',
    recommendation: 'BUY',
    thresholds: { theta: 0.67, delta: 0.2 },
    scores: { sigmaPlus: 0.75, sigmaMinus: 0.475, gap: 0.275 },
    bullish: {
      aggregated: { gamma: 0.5, rho: 0 },
      net: { gamma: 0.5, rho: 0 },
      supporters: [
        { rule: 'R1', predicate: 'rsi_bullish', indicator: 'RSI', omega: 20, gamma: 0.8, rho: 0.1, rawValue: 72.5 },
      ],
    },
    bearish: {
      aggregated: { gamma: 0, rho: 0.05 },
      net: { gamma: 0, rho: 0.05 },
      supporters: [],
    },
  };
}

describe('NARRATIVE_SYSTEM_PROMPT', () => {
  it('is byte-identical to the reviewed golden constant', () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toBe(GOLDEN_SYSTEM_PROMPT);
  });

  it('is written in Spanish and instructs the model per proposal decisions (language, disclaimer, grounding)', () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('español');
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('generado por inteligencia artificial');
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('analista humano');
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('supporters');
  });

  it('the source module has zero string interpolation ("${") anywhere — no injection surface by construction (T-4)', () => {
    const source = readFileSync(promptSourcePath, 'utf-8');
    expect(source).not.toContain('${');
  });
});

describe('buildUserMessage', () => {
  it('embeds only the whitelisted NarrativeFacts fields, serialized as JSON', () => {
    const facts = narrativeFactsFixture();

    const message = buildUserMessage(facts);
    const parsed = JSON.parse(message);

    expect(parsed).toEqual(facts);
    expect(message).toBe(JSON.stringify(facts));
  });

  it('never wraps the JSON in prose the model could misparse as instructions', () => {
    const facts = narrativeFactsFixture();

    const message = buildUserMessage(facts);

    expect(message.trim().startsWith('{')).toBe(true);
    expect(message.trim().endsWith('}')).toBe(true);
    expect(() => JSON.parse(message)).not.toThrow();
  });
});
