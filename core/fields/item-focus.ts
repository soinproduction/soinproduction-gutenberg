/** A canvas row and its Inspector panel share this key, including across the editor iframe. */
const listeners = new Set<(key: string) => void>();
let current = '';
export function focusListItem(key: string) {
    current = key;
    listeners.forEach(listener => listener(key));
}
export function selectedListItem() { return current; }
export function onListItemFocus(listener: (key: string) => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
