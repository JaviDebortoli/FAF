import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NarrativeFacts } from '@/src/narrative/facts';

// design.md "Claude call shape" + threat T-5: the Anthropic client is
// constructed INSIDE the call, never at module scope, so an absent key
// cannot break import/build and every non-LLM code path never touches the
// SDK. Only `text_delta` content is ever forwarded — `thinking_delta` (and
// any other event) is discarded server-side and must never reach a caller.

const streamMock = vi.fn();
const ctorMock = vi.fn().mockImplementation(() => ({ messages: { stream: streamMock } }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: ctorMock,
}));

function fakeAnthropicStream(events: Array<Record<string, unknown>>) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const event of events) yield event;
    },
  };
}

const FACTS: NarrativeFacts = {
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

beforeEach(() => {
  streamMock.mockReset();
  ctorMock.mockClear();
});

describe('streamNarrative — client construction (T-5)', () => {
  it('does not construct the Anthropic client merely by being imported', async () => {
    await import('@/src/narrative/client');

    expect(ctorMock).not.toHaveBeenCalled();
  });

  it('constructs the Anthropic client only once the returned generator is actually pulled, not at call time', async () => {
    streamMock.mockReturnValue(fakeAnthropicStream([]));
    const { streamNarrative } = await import('@/src/narrative/client');

    const generator = streamNarrative(FACTS);
    // Calling the async generator function only creates the generator
    // object; its body (including `new Anthropic()`) has not run yet.
    expect(ctorMock).not.toHaveBeenCalled();

    await generator.next();

    expect(ctorMock).toHaveBeenCalledTimes(1);
  });
});

describe('streamNarrative — stream-delta forwarding', () => {
  it('forwards only text_delta content and discards thinking_delta chunks entirely', async () => {
    streamMock.mockReturnValue(
      fakeAnthropicStream([
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'razonamiento oculto' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'content_block_start', index: 1, content_block: { type: 'text' } },
        { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Hola' } },
        { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: ' mundo' } },
        { type: 'content_block_stop', index: 1 },
        { type: 'message_stop' },
      ]),
    );
    const { streamNarrative } = await import('@/src/narrative/client');

    const chunks: string[] = [];
    for await (const chunk of streamNarrative(FACTS)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hola', ' mundo']);
    expect(chunks.join('')).not.toContain('razonamiento oculto');
  });

  it('yields nothing for a stream with no text_delta events', async () => {
    streamMock.mockReturnValue(fakeAnthropicStream([{ type: 'message_stop' }]));
    const { streamNarrative } = await import('@/src/narrative/client');

    const chunks: string[] = [];
    for await (const chunk of streamNarrative(FACTS)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([]);
  });
});

describe('streamNarrative — call shape', () => {
  it('calls messages.stream with claude-haiku-4-5, no thinking, no output_config, the static system prompt, and the JSON-serialized facts', async () => {
    streamMock.mockReturnValue(fakeAnthropicStream([]));
    const { streamNarrative } = await import('@/src/narrative/client');
    const { NARRATIVE_SYSTEM_PROMPT, buildUserMessage } = await import('@/src/narrative/prompt');

    const generator = streamNarrative(FACTS);
    await generator.next();

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(streamMock).toHaveBeenCalledWith({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: NARRATIVE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(FACTS) }],
    });
  });
});
