/** Shared row planning for the editor and published site. No editor APIs or DOM state. */
export function planFlowRows<T extends { fullRow?: boolean; width?: number }>(items: T[], maxCol = 2): T[][] {
    const limit = Math.max(1, Math.floor(Number(maxCol) || 2));
    const rows: T[][] = [];
    let row: T[] = [];
    const flush = () => { if (row.length) rows.push(row); row = []; };
    for (const item of items) {
        if (item.fullRow || item.width === 100) { flush(); rows.push([item]); continue; }
        const used = row.reduce((sum, current) => sum + (Number(current.width) || 0), 0);
        if (row.length && item.width && used + item.width > 100) flush();
        row.push(item);
        if (row.length >= limit || row.reduce((sum, current) => sum + (Number(current.width) || 0), 0) >= 100) flush();
    }
    flush();
    return rows;
}
export function flowShares(items: { width?: number }[]): number[] {
    if (items.length === 1) return [1];
    const fixed = items.reduce((sum, item) => sum + (Number(item.width) || 0), 0);
    const auto = items.filter(item => !item.width).length;
    const weights = items.map(item => Number(item.width) || Math.max(1, (100 - fixed) / (auto || 1)));
    const total = weights.reduce((a,b) => a+b,0);
    return weights.map(weight => weight / total);
}
export type Placement = { start?: number; span?: number; verticalAlign?: string; horizontalAlign?: string };
export type FlowColumnValue = Placement & { fullRow?: boolean; responsive?: Record<string, Placement> };
/** Column placement on a Drag `grid`; the PHP renderer mirrors it in `flow_column_layers`. */
export function flowPlacement(grid: number, column: Placement, palette: Placement = {}, maxCol = 2) {
    const whole = (value: unknown) => Math.floor(Number(value) || 0);
    const span = Math.min(grid, Math.max(1, whole(column.span) || whole(palette.span) || Math.round(grid / Math.max(1, maxCol))));
    const start = whole(column.start) || whole(palette.start);
    return { span, start: start ? Math.min(grid - span + 1, Math.max(1, start)) : 0 };
}
/**
 * Placement per screen range. The column's own `start`/`span` (or the Cols defaults) are the `default` layer,
 * which applies from the `base` breakpoint up. `responsive[name]` replaces it only between that breakpoint and the
 * next one in `breakpoints`; below `base` a column without a placement of its own spans the row. Breakpoints
 * narrower than `base` count in `mobileGrid` tracks.
 */
export function flowLayers(grid: number, column: FlowColumnValue, palette: Placement = {}, maxCol = 2, base = '', breakpoints: string[] = [], mobileGrid = grid) {
    const layers: Record<string, { start: number; span: number }> = {};
    if (!grid || column.fullRow) return layers;
    const own = flowPlacement(grid, column, palette, maxCol);
    layers.default = own;
    const below = new Set(breakpoints.slice(0, Math.max(0, breakpoints.indexOf(base))));
    for (const name of breakpoints) {
        const value = column.responsive?.[name];
        if (value && (value.span || value.start)) layers[name] = flowPlacement(below.has(name) ? mobileGrid : grid, value, { span: own.span }, maxCol);
    }
    return layers;
}
/** Tracks at a breakpoint: `mobileGrid` below the base breakpoint, `grid` from it up. */
export function flowTracks(grid: number, mobileGrid: number, base: string, breakpoints: string[], name: string | null) {
    const index = name ? breakpoints.indexOf(name) : -1;
    return index >= 0 && index < breakpoints.indexOf(base) ? mobileGrid : grid;
}
/** `mobileGrid` from the Drag props: 6 by default, never more than `grid`. */
export function flowMobileGrid(grid: number, mobileGrid: unknown) {
    return Math.min(grid, Math.max(1, Math.floor(Number(mobileGrid) || 6)));
}
/** Classes and CSS variables the generated breakpoint rules read. */
export function flowColumnLayout(...args: Parameters<typeof flowLayers>) {
    const layers = flowLayers(...args);
    const style: Record<string, string> = {};
    for (const [name, { start, span }] of Object.entries(layers)) {
        style['--site-col-' + name + '-start'] = start ? String(start) : 'auto';
        style['--site-col-' + name + '-span'] = String(span);
    }
    const classes = Object.keys(layers).map(name => 'site-col-at-' + name);
    for (const [name,value] of Object.entries(args[1].responsive??{})) {
        if (!args[5]?.includes(name)) continue;
        const vertical={top:'flex-start',center:'center',bottom:'flex-end'}[value.verticalAlign??''];
        const horizontal={left:'flex-start',center:'center',right:'flex-end',stretch:'stretch'}[value.horizontalAlign??''];
        if(vertical){style['--site-align-'+name+'-vertical']=vertical;classes.push('site-align-v-'+name);}
        if(horizontal){style['--site-align-'+name+'-horizontal']=horizontal;style['--site-align-'+name+'-text']=value.horizontalAlign==='stretch'?'inherit':value.horizontalAlign!;classes.push('site-align-h-'+name);}
    }
    return { classes, style };
}
/** Drag `gap` is in rem; a string passes through as a CSS length. */
export function flowGap(gap: unknown) {
    if (typeof gap === 'number' && Number.isFinite(gap) && gap >= 0) return gap + 'rem';
    return typeof gap === 'string' && /^[\d.]+(rem|em|%)$/.test(gap.trim()) ? gap.trim() : undefined;
}
export function resolveFlowTemplate(template: any[], section: string, palette = ''): any[] {
    return template.map(item => [item[0] === '__element__' ? section + (palette ? '-' + palette : '') + '-element' : item[0], item[1], ...(item[2] ? [resolveFlowTemplate(item[2], section, palette)] : [])]);
}
