/** How the interface should resolve its theme. `system` follows the OS. */
export type ThemePreference = 'light' | 'dark' | 'system'

export interface Preferences {
  theme: ThemePreference
  /** The install click. On by default — it's the product's signature. */
  sound: boolean
  /** False until someone has been through first run once. */
  onboarded: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  sound: true,
  onboarded: false
}
