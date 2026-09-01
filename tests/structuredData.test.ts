import { describe, expect, it } from 'vitest';

import { serialiseJsonLd } from '@/lib/structuredData';

const LINE_SEPARATOR = '\u2028';
const PARAGRAPH_SEPARATOR = '\u2029';

describe('serialiseJsonLd', () => {
  it('cannot be used to close the script element', () => {
    const output = serialiseJsonLd({ headline: '</script><script>alert(1)</script>' });

    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
  });

  it('escapes ampersands, which HTML parsers also act on', () => {
    expect(serialiseJsonLd({ a: 'x & y' })).not.toContain('&');
  });

  it('escapes separators that are valid JSON but not valid JavaScript', () => {
    const output = serialiseJsonLd({ a: `a${LINE_SEPARATOR}b${PARAGRAPH_SEPARATOR}c` });
    expect(output).not.toContain(LINE_SEPARATOR);
    expect(output).not.toContain(PARAGRAPH_SEPARATOR);
  });

  it('still parses back to exactly the original value', () => {
    const payload = {
      headline: '</script> & <b>bold</b> end',
      authors: [`A${LINE_SEPARATOR}B`],
      nested: { n: 1, t: true, z: null },
    };
    expect(JSON.parse(serialiseJsonLd(payload))).toEqual(payload);
  });

  it('leaves ordinary text alone', () => {
    expect(serialiseJsonLd({ a: 'Verifiable Fully Homomorphic Encryption' })).toBe(
      '{"a":"Verifiable Fully Homomorphic Encryption"}'
    );
  });
});
