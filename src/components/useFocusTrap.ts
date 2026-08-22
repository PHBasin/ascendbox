// src/components/useFocusTrap.ts
// Keyboard containment for a modal surface (DESIGN §8).
//
// `role="dialog" aria-modal="true"` is a promise to assistive tech: *nothing behind this is
// reachable*. The filter sheet made that promise and kept none of it - focus stayed on the button
// behind the scrim, Tab walked the feed underneath, and closing left focus on <body>. The correct
// choreography already existed in the app (the search field moves focus with its own swap); this is
// that same idea, in one place, for the surface that actually needed it.
import { nextTick, onBeforeUnmount, watch } from 'vue';
import type { Ref } from 'vue';

// Deliberately the plain set: the sheet holds buttons and nothing exotic, and a heuristic broad
// enough to cover every focusable element is a heuristic broad enough to catch hidden ones too.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    // `offsetParent === null` catches `display:none`; a zero-size element is not somewhere a coach
    // can be sent.
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

/**
 * @param container the modal surface; focus is moved into it and kept there while `isOpen` is true
 * @param isOpen    a getter, so the caller keeps ownership of the open state
 */
export function useFocusTrap(container: Ref<HTMLElement | null>, isOpen: () => boolean): void {
  // Where focus came from, so it can be handed back - the half of the contract that is easiest to
  // forget and most obvious to a keyboard user when it is missing.
  let previouslyFocused: HTMLElement | null = null;

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const el = container.value;
    if (!el) return;

    const focusable = focusableWithin(el);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    const active = document.activeElement;
    // Focus escaped the surface (or never entered it): pull it back rather than let Tab leak.
    if (!(active instanceof HTMLElement) || !el.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function release(): void {
    document.removeEventListener('keydown', onKeydown, true);
  }

  watch(
    isOpen,
    (open) => {
      if (open) {
        previouslyFocused =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // Capture phase: the trap has to see Tab before anything inside can stop it.
        document.addEventListener('keydown', onKeydown, true);
        void nextTick(() => {
          const el = container.value;
          if (!el) return;
          (focusableWithin(el)[0] ?? el).focus();
        });
      } else {
        release();
        const restoreTo = previouslyFocused;
        previouslyFocused = null;
        // **`nextTick`, and it is load-bearing** - the restore is not symmetric with the capture.
        // The caller holds `inert` on the app root as the other half of `aria-modal`, and it drops
        // it in *its own* watcher on the same state. Watchers run in creation order, and the trap is
        // installed first, so restoring synchronously aimed `.focus()` at a control still inside an
        // inert subtree: refused outright, no error, focus left behind in the closing panel and then
        // dropped to <body> when it unmounted. The promise in DESIGN §8 - focus returns to the
        // invoking control - was never actually kept. Deferring past the flush lets `inert` come off
        // first, and mirrors the `nextTick` the open path already needs.
        void nextTick(() => {
          // Still in the document: `.focus()` on a detached node is a silent no-op. The invoking
          // control can genuinely be gone by now (the sheet's reset button unmounts once the last
          // filter clears), so this is a real path, not a defensive flourish.
          if (restoreTo?.isConnected === true) restoreTo.focus();
        });
      }
    },
    // A surface that mounts already open (a deep link, a restored keep-alive) must be trapped too -
    // the guard costs one option and removes a whole class of latent bug.
    { immediate: true }
  );

  onBeforeUnmount(release);
}
