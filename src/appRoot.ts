// src/appRoot.ts
// The id Vue mounts onto, named once.
//
// `FilterSheet` takes `inert` off this element to make `aria-modal="true"` a behaviour rather than a
// label. It used to find it with a literal `document.getElementById('app')`, with nothing tying that
// string to `main.ts`'s `mount('#app')`: renaming the mount point would have left the sheet querying
// a node that no longer exists, `toggleAttribute` skipped by the optional chain, and the feed
// reachable behind an open modal - silently, with every gate still green.
export const APP_ROOT_ID = 'app';
