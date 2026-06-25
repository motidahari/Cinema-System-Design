// useStorage is for NON-SENSITIVE UI preferences only (e.g. last-viewed section,
// theme). It must NEVER store auth tokens — those live exclusively in httpOnly
// cookies the SPA cannot read (see SECURITY.md / FRONTEND-DESIGN.md §5.6).
export function useStorage() {
    const get = (key: string): string | null => localStorage.getItem(key);
    const set = (key: string, value: string): void => localStorage.setItem(key, value);
    const remove = (key: string): void => localStorage.removeItem(key);
    return { get, set, remove };
}
