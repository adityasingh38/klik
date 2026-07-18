import { klikApi } from '../api/klikApi'

/**
 * Klik ships for Windows and macOS, so any shortcut shown in the UI has to name the
 * right modifier. The key handlers accept both meta and ctrl; only the label differs.
 * Read from the preload's `process.platform` rather than the deprecated
 * `navigator.platform`, and resolved once at module load so labels are correct on
 * first paint instead of flashing the wrong glyph.
 */
export const IS_MAC = klikApi?.platform === 'darwin'

/** "⌘" on macOS, "Ctrl" everywhere else. Rendered as its own key cap. */
export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl'
