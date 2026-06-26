// For NON-SENSITIVE UI preferences only (e.g. theme). Must NEVER store auth
// tokens — those live exclusively in httpOnly cookies the SPA cannot read.
export function useStorage() {
    const get = (key: string): string | null => localStorage.getItem(key);
    const set = (key: string, value: string): void => localStorage.setItem(key, value);
    const remove = (key: string): void => localStorage.removeItem(key);
    return { get, set, remove };
}
