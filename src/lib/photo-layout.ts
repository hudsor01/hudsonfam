export type PhotoLayout = 'auto' | 'wide' | 'tall' | 'feature';

/** Bento span className for the LayoutGrid (md:grid-cols-3, auto-rows). */
export function layoutToSpan(layout: string, width: number, height: number): string {
  switch (layout) {
    case 'wide':
      return 'md:col-span-2';
    case 'tall':
      return 'md:row-span-2';
    case 'feature':
      return 'md:col-span-2 md:row-span-2';
    case 'auto':
    default: {
      if (!width || !height) return '';
      const ratio = width / height;
      if (ratio >= 1.2) return 'md:col-span-2';
      if (ratio <= 0.8) return 'md:row-span-2';
      return '';
    }
  }
}
