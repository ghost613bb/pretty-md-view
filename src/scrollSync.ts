import type * as vscode from 'vscode';

interface EditorLike {
  document: {
    lineCount: number;
  };
  visibleRanges: Array<{
    start: {
      line: number;
    };
    end: {
      line: number;
    };
  }>;
}

export interface PreviewScrollSyncState {
  sourceLine: number;
  maxLine: number;
  fallbackRatio: number;
}

export interface PendingEditorScrollSync {
  targetLine: number;
  targetFallbackRatio: number;
  expiresAt: number;
  toleranceLines: number;
  fallbackRatioTolerance: number;
}

export interface ScrollSyncToleranceOptions {
  lineTolerance?: number;
  fallbackRatioTolerance?: number;
}

const DEFAULT_LINE_TOLERANCE = 1;
const DEFAULT_FALLBACK_RATIO_TOLERANCE = 0.02;

export function getEditorScrollSyncState(editor: EditorLike | vscode.TextEditor): PreviewScrollSyncState {
  const visibleRange = editor.visibleRanges[0];
  const totalLines = editor.document.lineCount;
  const maxLine = Math.max(0, totalLines - 1);

  if (!visibleRange || totalLines <= 1) {
    return {
      sourceLine: 0,
      maxLine,
      fallbackRatio: 0
    };
  }

  const visibleLineCount = Math.max(1, visibleRange.end.line - visibleRange.start.line + 1);
  const maxTopLine = Math.max(1, totalLines - visibleLineCount);

  return {
    sourceLine: clamp(visibleRange.start.line, 0, maxLine),
    maxLine,
    fallbackRatio: clamp(visibleRange.start.line / maxTopLine, 0, 1)
  };
}

export function isScrollSyncStateNear(
  left: PreviewScrollSyncState | undefined,
  right: PreviewScrollSyncState | undefined,
  options: ScrollSyncToleranceOptions = {}
): boolean {
  if (!left || !right) {
    return false;
  }

  const lineTolerance = options.lineTolerance ?? DEFAULT_LINE_TOLERANCE;
  const fallbackRatioTolerance = options.fallbackRatioTolerance ?? DEFAULT_FALLBACK_RATIO_TOLERANCE;

  return (
    Math.abs(left.sourceLine - right.sourceLine) <= lineTolerance &&
    Math.abs(left.fallbackRatio - right.fallbackRatio) <= fallbackRatioTolerance
  );
}

export function shouldSuppressPreviewDrivenEditorSync(
  pendingSync: PendingEditorScrollSync,
  currentState: PreviewScrollSyncState,
  now = Date.now()
): boolean {
  if (now > pendingSync.expiresAt) {
    return false;
  }

  return (
    Math.abs(currentState.sourceLine - pendingSync.targetLine) <= pendingSync.toleranceLines ||
    Math.abs(currentState.fallbackRatio - pendingSync.targetFallbackRatio) <= pendingSync.fallbackRatioTolerance
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
