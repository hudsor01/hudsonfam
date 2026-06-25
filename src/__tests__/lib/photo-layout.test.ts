import { describe, it, expect } from 'vitest';
import { layoutToSpan } from '@/lib/photo-layout';

describe('layoutToSpan', () => {
  it('maps explicit layouts to spans', () => {
    expect(layoutToSpan('wide', 100, 100)).toBe('md:col-span-2');
    expect(layoutToSpan('tall', 100, 100)).toBe('md:row-span-2');
    expect(layoutToSpan('feature', 100, 100)).toBe('md:col-span-2 md:row-span-2');
  });
  it('auto: landscape -> wide, portrait -> tall, square -> normal', () => {
    expect(layoutToSpan('auto', 1600, 900)).toBe('md:col-span-2');
    expect(layoutToSpan('auto', 900, 1600)).toBe('md:row-span-2');
    expect(layoutToSpan('auto', 1000, 1000)).toBe('');
  });
  it('auto with missing dimensions -> normal', () => {
    expect(layoutToSpan('auto', 0, 0)).toBe('');
  });
});
