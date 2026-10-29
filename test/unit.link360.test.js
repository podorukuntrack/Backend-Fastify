import { describe, it, expect } from 'vitest';
import { updateUnitSchema } from '../src/modules/units/unit.schema.js';

const parse = (body) => updateUnitSchema.body.safeParse(body);

describe('unit link foto 360 contract', () => {
  it('accepts http(s) links and trims them', () => {
    const r = parse({ link_foto_360: '  https://kuula.co/share/abc  ' });
    expect(r.success).toBe(true);
    expect(r.data.link_foto_360).toBe('https://kuula.co/share/abc');
    expect(parse({ linkFoto360: 'http://example.test/360' }).success).toBe(true);
  });

  it('accepts empty string or null to clear the link', () => {
    expect(parse({ link_foto_360: '' }).success).toBe(true);
    expect(parse({ link_foto_360: null }).success).toBe(true);
  });

  it('keeps the field absent when not sent, so other unit edits leave the link alone', () => {
    const r = parse({ progress_percentage: 50 });
    expect(r.success).toBe(true);
    expect('link_foto_360' in r.data).toBe(false);
  });

  it('rejects non-http schemes and plain text', () => {
    for (const v of ['javascript:alert(1)', 'ftp://x.test/a', 'kuula.co/abc', 'https://a b']) {
      expect(parse({ link_foto_360: v }).success).toBe(false);
    }
  });
});
