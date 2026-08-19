/**
 * The one toggle recipe, shared by the scope pills (DESIGN §5.2) and the filter sheet's options
 * (§5.5) - §5.5 asks for "the same interaction", and until these constants existed only the scope
 * bar had it: the sheet ran a flat 300/300.
 *
 * The skin itself (fill, ring, ink, plus `transition ease-out active:scale-95`) is `.toggle-on` /
 * `.toggle-off` in main.css. Only the **duration** lives here, because it is the one thing that
 * differs by state (§6): selecting fills over 300ms - the tapped target, confirmed where the eye
 * already is - while deselecting recedes over 150ms, since it happens as a by-product of another
 * action and must not pull the eye.
 *
 * Full static strings, never concatenated: the JIT scanner reads a `.ts` like any other source
 * (§10), which is what lets these be shared at no cost.
 */
export const TOGGLE_ON = 'duration-300 toggle-on';
export const TOGGLE_OFF = 'duration-150 toggle-off';

/** The same asymmetry for a child that must fill in step with its pill (the scope bar's icon). */
export const TOGGLE_ON_DURATION = 'duration-300';
export const TOGGLE_OFF_DURATION = 'duration-150';
