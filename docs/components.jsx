import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Braces, Check, ChevronDown, ChevronRight, CodeXml, Copy, FileCode2, Github, Images, Layers3, LayoutTemplate, Menu, MousePointer2, Search, Type, X} from 'lucide-react';
import {entries, children, nested, propRows} from './catalog';

export const github = 'https://github.com/soinproduction/soinproduction-gutenberg';
export const groups = [...new Set(entries.map(([group]) => group))];
export const parents = new Map(Object.entries(children).flatMap(([parent, items]) => items.map(item => [item, parent])));
export const groupIcons = {Разметка: LayoutTemplate, Контент: Type, Медиа: Images, 'Ссылки и формы': MousePointer2, Коллекции: Layers3};
export {ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Braces, Check, CodeXml, FileCode2, Github, Layers3, LayoutTemplate};

export function Action({href, children, icon: Icon, variant = 'white', className = '', ...props}) {
  const Tag = href ? 'a' : 'button';
  return <Tag {...(href ? {href} : {type: 'button'})} className={`action action-${variant} ${className}`} {...props}>{children}{Icon && <Icon size={18} aria-hidden="true" />}</Tag>;
}

export function CodeBlock({code, title = 'JSX', tone = 'light'}) {
  const [status, setStatus] = useState('');
  const source = useRef(null);
  useEffect(() => { if (!status) return; const timer = setTimeout(() => setStatus(''), 2200); return () => clearTimeout(timer); }, [status]);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setStatus('Скопировано'); }
    catch { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(source.current); selection.removeAllRanges(); selection.addRange(range); setStatus('Код выделен'); }
  }
  const pattern = /(<\/?[A-Z][\w.]*|"(?:[^"]*)"|'(?:[^']*)'|\b[\w]+(?==)|[{}])/g;
  const lines = code.split('\n');
  return <div className={`snippet snippet-${tone}`}>
    <div className="snippet-bar"><span><CodeXml size={16} aria-hidden="true" />{title}</span><button type="button" className="copy-button" onClick={copy} aria-label={status || 'Копировать код'}>{status === 'Скопировано' ? <Check size={16} /> : <Copy size={16} />}<span>{status || 'Копировать'}</span></button></div>
    <pre tabIndex={0} aria-label={`Код ${title}`}><code ref={source}>{lines.map((line, lineIndex) => <span className="code-line" data-line={lineIndex + 1} key={lineIndex}>{line.split(pattern).map((part, index) => index % 2 ? <span key={index} className={part.startsWith('<') ? 'syntax-tag' : /^["']/.test(part) ? 'syntax-string' : /^[{}]$/.test(part) ? 'syntax-brace' : 'syntax-prop'}>{part}</span> : part)}{lineIndex < lines.length - 1 ? '\n' : ''}</span>)}</code></pre>
    <span className="sr-only" aria-live="polite">{status}</span>
  </div>;
}

function Catalog({selected, pattern, onNavigate}) {
  function link(item, depth = 0) { return <a className={depth ? 'nested' : ''} href={`./#${item}`} key={item} onClick={onNavigate} aria-current={selected === item ? 'page' : undefined}><span>{item}</span>{selected === item && <span className="current-dot" />}</a>; }
  return <>
    <div className="catalog-intro"><a href="./" aria-current={!selected && !pattern ? 'page' : undefined} onClick={onNavigate}><BookOpen size={18} />Обзор</a><a href="./pattern.html" aria-current={pattern ? 'page' : undefined} onClick={onNavigate}><FileCode2 size={18} />Паттерн компонентов</a></div>
    <div className="catalog-label">Компоненты<span>{entries.length}</span></div>
    {groups.map(group => { const Icon = groupIcons[group]; return <div className="nav-group" key={group}><h2><Icon size={16} />{group}</h2>{entries.filter(([category, name]) => category === group && !nested.has(name)).map(([, item]) => <div key={item}>{link(item)}{(item === selected || parents.get(selected) === item || parents.get(parents.get(selected)) === item) && (children[item] ?? []).flatMap(child => [link(child, 1), ...(child === selected || parents.get(selected) === child ? (children[child] ?? []).map(part => link(part, 2)) : [])])}</div>)}</div>; })}
    <a className="catalog-source" href={github}><Github size={16} />Исходный код<ArrowUpRight size={14} /></a>
  </>;
}

const searchableEntries = entries.map(entry => ({entry, text: [entry.join(' '), ...propRows(entry[1]).flat()].join(' ').toLocaleLowerCase('ru')}));
function SearchDialog({open, onClose}) {
  const dialog = useRef(null); const input = useRef(null);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState(''); const [index, setIndex] = useState(0);
  const term = query.trim().toLocaleLowerCase('ru');
  const results = useMemo(() => searchableEntries.filter(({entry, text}) => (!filter || filter === entry[0]) && text.includes(term)).sort((a, b) => Number(b.entry[1].toLowerCase().startsWith(term)) - Number(a.entry[1].toLowerCase().startsWith(term))), [term, filter]);
  useEffect(() => { if (open) { dialog.current.showModal(); input.current.focus(); } else dialog.current.close(); }, [open]);
  useEffect(() => setIndex(0), [term, filter]);
  useEffect(() => { document.getElementById(`search-result-${index}`)?.scrollIntoView({block: 'nearest'}); }, [index]);
  const go = name => { onClose(); location.href = `./#${name}`; };
  function keyboard(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setIndex(current => Math.max(0, Math.min(results.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))); }
    if (event.key === 'Enter' && results[index]) { event.preventDefault(); go(results[index].entry[1]); }
  }
  return <dialog className="search-dialog" ref={dialog} onClose={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }} aria-labelledby="search-title"><div className="search-dialog-inner">
    <h2 id="search-title" className="sr-only">Поиск по документации</h2>
    <div className="search-input-row"><Search size={22} aria-hidden="true" /><input ref={input} type="search" placeholder="Компонент, пропс или задача…" aria-label="Поиск по компонентам и пропсам" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="search-results" aria-activedescendant={results.length ? `search-result-${index}` : undefined} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={keyboard} /><button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть поиск"><X size={20} /></button></div>
    <div className="search-filter"><label htmlFor="search-group">Искать в</label><select id="search-group" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Всех группах</option>{groups.map(group => <option key={group}>{group}</option>)}</select><span role="status">Найдено: {results.length}</span></div>
    <div id="search-results" className="search-results" role="listbox" aria-label="Результаты поиска">{results.map(({entry: [group, name, , description]}, itemIndex) => <div id={`search-result-${itemIndex}`} key={name} role="option" aria-selected={index === itemIndex} className="search-result" onMouseMove={() => setIndex(itemIndex)} onClick={() => go(name)}><div className="search-result-icon"><CodeXml size={20} /></div><div><strong>{name}<small>{group}</small></strong><p>{description}</p></div><ArrowUpRight size={18} /></div>)}</div>
    {!results.length && <div className="search-empty"><Search size={28} /><h3>Ничего не найдено</h3><p>Попробуйте название компонента или пропса — например, Heading, grid или name.</p><Action onClick={() => { setQuery(''); setFilter(''); input.current.focus(); }}>Сбросить поиск</Action></div>}
    <div className="search-help"><span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Esc</kbd> закрыть</span></div>
  </div></dialog>;
}

export function DocsShell({selected, pattern = false, children}) {
  const [searchOpen, setSearchOpen] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const drawer = useRef(null); const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    const shortcut = event => { const editing = event.target.closest('input, select, textarea, [contenteditable]'); if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !editing && !event.metaKey && !event.ctrlKey && !event.altKey)) { event.preventDefault(); setMenuOpen(false); setSearchOpen(value => !value); } };
    const navigate = () => { setMenuOpen(false); setSearchOpen(false); }; const wide = window.matchMedia('(min-width: 1001px)'); const resized = () => { if (wide.matches) setMenuOpen(false); };
    window.addEventListener('keydown', shortcut); window.addEventListener('hashchange', navigate); wide.addEventListener('change', resized);
    return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('hashchange', navigate); wide.removeEventListener('change', resized); };
  }, []);
  useEffect(() => { if (menuOpen) drawer.current.showModal(); else drawer.current.close(); }, [menuOpen]);
  return <>
    <a className="skip" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus(); }}>К содержимому</a>
    <header className="topbar"><div className="topbar-inner">
      <a href="./" className="brand" aria-label="Gutenberg Kit — главная"><img src="./soinlab-symbol.svg" width="28" height="44" alt="" /><span>Gutenberg Kit<span className="brand-by">by SoinLAB</span></span></a>
      <nav className="top-nav" aria-label="Главная навигация"><a href="./" aria-current={!pattern ? 'page' : undefined}>Документация</a><a href="./pattern.html" aria-current={pattern ? 'page' : undefined}>Паттерн</a></nav>
      <button className="search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label="Поиск по документации" aria-keyshortcuts="/ Control+k Meta+k"><Search size={18} /><span>Поиск по документации</span><kbd>⌘ K</kbd></button>
      <a href={github} className="github-link" aria-label="Репозиторий на GitHub"><Github size={20} /><span>GitHub</span><ArrowUpRight size={16} /></a>
      <button type="button" className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Открыть каталог" aria-haspopup="dialog"><Menu size={22} /></button>
    </div></header>
    <div className="layout"><aside className="catalog"><nav aria-label="Каталог компонентов"><Catalog selected={selected} pattern={pattern} /></nav></aside><main id="main" tabIndex={-1} className={selected || pattern ? 'main-reference' : 'main-overview'}>{children}</main></div>
    <dialog ref={drawer} className="catalog-drawer" aria-labelledby="drawer-title" onClose={closeMenu} onClick={event => { if (event.target === drawer.current) closeMenu(); }}><div className="drawer-inner"><div className="drawer-title"><strong id="drawer-title">Документация</strong><button type="button" className="icon-button" onClick={closeMenu} aria-label="Закрыть каталог"><X size={20} /></button></div><nav aria-label="Мобильный каталог компонентов"><Catalog selected={selected} pattern={pattern} onNavigate={closeMenu} /></nav></div></dialog>
    <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
  </>;
}

export function Breadcrumbs({items = []}) { return <nav className="breadcrumbs" aria-label="Хлебные крошки"><a href="./">Документация</a>{items.map(([label, href], index) => <span key={index}><ChevronRight size={12} />{href ? <a href={href}>{label}</a> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{label}</span>}</span>)}</nav>; }
export function PageOutline({links, active}) { return <aside className="on-page"><nav aria-label="На этой странице"><strong>На этой странице</strong>{links.map(([id, title]) => <a href={`#${id}`} key={id} aria-current={active === id ? 'location' : undefined}>{title}</a>)}</nav><div className="outline-help"><CodeXml size={20} /><strong>Есть улучшение?</strong><p>Документация живёт рядом с кодом.</p><a href={`${github}/blob/main/docs/catalog.js`}>Открыть на GitHub<ArrowUpRight size={14} /></a></div></aside>; }
export function MobileOutline({links}) { return <details className="mobile-outline"><summary>На этой странице<ChevronDown size={16} /></summary><nav aria-label="Оглавление статьи">{links.map(([id, title]) => <a key={id} href={`#${id}`} onClick={event => event.currentTarget.closest('details').removeAttribute('open')}>{title}</a>)}</nav></details>; }
export function DocFooter() { return <footer className="doc-footer"><span>Gutenberg Kit<span className="footer-separator">/</span>by SoinLAB</span><a href={github}>Исходный код<ArrowUpRight size={14} /></a></footer>; }
