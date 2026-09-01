import { describe, expect, it } from 'vitest';

import { parseArxivId } from '@/lib/arxiv-id';

describe('parseArxivId', () => {
  it.each([
    ['http://arxiv.org/abs/2301.07041v2', '2301.07041'],
    ['https://arxiv.org/abs/2301.07041', '2301.07041'],
    ['https://arxiv.org/pdf/2301.07041v2', '2301.07041'],
    ['https://arxiv.org/pdf/2301.07041.pdf', '2301.07041'],
    ['arXiv:2301.07041', '2301.07041'],
    ['2301.07041', '2301.07041'],
    ['  2301.07041  ', '2301.07041'],
  ])('normalises %s', (input, expected) => {
    expect(parseArxivId(input)).toBe(expected);
  });

  it.each([
    ['https://arxiv.org/abs/cs/0701001v1', 'cs/0701001'],
    ['cs/0701001', 'cs/0701001'],
    ['hep-th/9901001v3', 'hep-th/9901001'],
    ['math.GT/0309136', 'math.GT/0309136'],
  ])('keeps the slash in old-style id %s', (input, expected) => {
    expect(parseArxivId(input)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['not-an-id', 'arbitrary text'],
    ['2301.070411111', 'too many digits'],
    ['2301.070', 'too few digits'],
    ['cs/070100', 'old style with too few digits'],
  ])('rejects %s (%s)', (input) => {
    expect(parseArxivId(input)).toBeNull();
  });

  // The result is interpolated straight into the arXiv query string, so
  // anything that could add a parameter has to be refused rather than trimmed.
  it.each(['2301.07041&search_query=x', '2301.07041 OR all:x', '../../etc/passwd'])(
    'refuses query-injection attempt %s',
    (input) => {
      expect(parseArxivId(input)).toBeNull();
    }
  );
});
