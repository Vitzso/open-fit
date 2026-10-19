// What an optional module tells the app about itself.

export interface ModuleManifest {
  /** Stable id, stored in Settings.enabledModules. Lower-case letters and hyphens. */
  id: string;
  name: string;
  /** One sentence for the Settings → Modules card. */
  description: string;
  /** What switching it on adds, one line each. */
  features: string[];
}
