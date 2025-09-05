import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Calls handler when a pointer event occurs outside the given element ref.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options?: {
    enabled?: boolean;
    ignoreRefs?: RefObject<HTMLElement | null>[];
    events?: Array<'mousedown' | 'mouseup' | 'click' | 'touchstart'>;
  }
) {
  const { enabled = true, ignoreRefs = [], events = ['mousedown', 'touchstart'] } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el) return;
      const target = event.target as Node;
      if (el.contains(target)) return;
      for (const ignore of ignoreRefs) {
        if (ignore.current && ignore.current.contains(target)) return;
      }
      handler(event);
    };

    events.forEach(evt => document.addEventListener(evt, listener));
    return () => {
      events.forEach(evt => document.removeEventListener(evt, listener));
    };
  }, [ref, handler, enabled, ignoreRefs, events]);
}
