// localStorage that never throws (private mode, blocked storage, server render).

/** Reads a saved value, or null if there is none or storage is unavailable. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Saves a value; silently does nothing if storage is unavailable. */
export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}
