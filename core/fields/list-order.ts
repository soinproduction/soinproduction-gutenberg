/** Target is an insertion boundary in the original list (0…length). */
export function reorderListItems<T>(items: T[], from: number, target: number): T[] {
    if (!Number.isInteger(from) || !Number.isInteger(target) || from < 0 || from >= items.length || target < 0 || target > items.length) return items;
    const to = target > from ? target - 1 : target;
    if (to === from) return items;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}
