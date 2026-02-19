// firebase.js
// Re-exports Firebase instances from state.js (single source of truth).
// All modules should import from state.js directly; this file exists
// for backwards compatibility with any legacy imports.

export { auth, db } from './modules/state.js';
