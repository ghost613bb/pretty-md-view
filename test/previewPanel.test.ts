import { describe, expect, it } from 'vitest';
import { getEditorScrollSyncState, shouldSuppressPreviewDrivenEditorSync } from '../src/scrollSync';

function createEditor(options: {
  lineCount: number;
  startLine: number;
  endLine: number;
  hasVisibleRange?: boolean;
}) {
  const visibleRanges = options.hasVisibleRange === false
    ? []
    : [{ start: { line: options.startLine }, end: { line: options.endLine } }];

  return {
    document: {
      lineCount: options.lineCount
    },
    visibleRanges
  } as never;
}

describe('getEditorScrollSyncState', () => {
  it('returns the top of the document when no visible range is available', () => {
    const state = getEditorScrollSyncState(createEditor({
      lineCount: 20,
      startLine: 0,
      endLine: 0,
      hasVisibleRange: false
    }));

    expect(state).toEqual({
      sourceLine: 0,
      maxLine: 19,
      fallbackRatio: 0
    });
  });

  it('calculates a proportional fallback ratio in the middle of a document', () => {
    const state = getEditorScrollSyncState(createEditor({
      lineCount: 100,
      startLine: 30,
      endLine: 39
    }));

    expect(state.sourceLine).toBe(30);
    expect(state.maxLine).toBe(99);
    expect(state.fallbackRatio).toBeCloseTo(30 / 90, 6);
  });

  it('clamps the fallback ratio near the bottom of the document', () => {
    const state = getEditorScrollSyncState(createEditor({
      lineCount: 5,
      startLine: 3,
      endLine: 4
    }));

    expect(state).toEqual({
      sourceLine: 3,
      maxLine: 4,
      fallbackRatio: 1
    });
  });
});

describe('shouldSuppressPreviewDrivenEditorSync', () => {
  it('suppresses editor echo while the preview-driven cooldown is active', () => {
    const shouldSuppress = shouldSuppressPreviewDrivenEditorSync(
      {
        targetLine: 43,
        expiresAt: 1_000
      },
      900
    );

    expect(shouldSuppress).toBe(true);
  });

  it('stops suppressing once the cooldown expires', () => {
    const shouldSuppress = shouldSuppressPreviewDrivenEditorSync(
      {
        targetLine: 43,
        expiresAt: 1_000
      },
      1_100
    );

    expect(shouldSuppress).toBe(false);
  });
});
