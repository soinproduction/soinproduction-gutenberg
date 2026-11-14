import {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowDownRight, ArrowUpRight, Braces, Check, CodeXml, Copy, Menu, Search, X} from 'lucide-react';
import {Button} from './ui/button';
import {entries, examples, children, related, nested, byName, propRows} from './catalog';
import {settings} from './settings';
import {usage} from './usage';
import './reference.css';

const groups = [...new Set(entries.map(([group]) => group))];
const parents = new Map(Object.entries(children).flatMap(([parent, items]) => items.map(item => [item, parent])));
const github = 'https://github.com/soinproduction/soinproduction-gutenberg';
const labels = ['Параметр', 'Тип', 'По умолчанию', 'Что меняет'];
const readHash = () => location.hash.slice(1);
const identifier = hash => hash.split('-')[0];

function Header({onSearch, onMenu, menuOpen}) {
  return <header className="topbar">
    <a href="./" className="brand"><span className="brand-mark"><Braces size={19} /></span> Gutenberg Kit</a>
    <nav aria-label="Главная навигация">
      <Button size="sm" color="tertiary" href="./pattern.html">Паттерн</Button>
      <Button size="sm" color="tertiary" href={github} iconTrailing={ArrowUpRight}>GitHub</Button>
      <Button size="sm" color="secondary" iconLeading={Search} onPress={onSearch} aria-label="Поиск" />
      <Button size="sm" color="secondary" className="menu-toggle" iconLeading={menuOpen ? X : Menu}
        onPress={onMenu} aria-label="Компоненты" aria-expanded={menuOpen} aria-controls="catalog-nav" />
    </nav>
  </header>;
}

function Snippet({code}) {
  const [status, setStatus] = useState('');
  const source = useRef(null);
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 2200);
    return () => clearTimeout(timer);
  }, [status]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('Скопировано');
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(source.current);
      selection.removeAllRanges();
      selection.addRange(range);
      setStatus('Код выделен');
    }
  }
  const pattern = /(<\/?[A-Z][\w.]*|"(?:[^"]*)"|'(?:[^']*)'|\b[\w]+(?==)|[{}])/g;
  return <div className="snippet">
    <div className="snippet-bar"><span><CodeXml size={15} /> JSX</span>
      <Button size="sm" color="tertiary" iconLeading={status === 'Скопировано' ? Check : Copy} onPress={copy}>{status || 'Копировать'}</Button>
    </div>
    <pre tabIndex={0}><code ref={source}>{code.split(pattern).map((part, index) => index % 2
      ? <span key={index} className={part.startsWith('<') ? 'syntax-tag' : /^['"]/.test(part) ? 'syntax-string' : /^[{}]$/.test(part) ? 'syntax-brace' : 'syntax-prop'}>{part}</span>
      : part)}</code></pre>
    <span className="sr-only" aria-live="polite">{status}</span>
  </div>;
}

function ReferenceTable({id, title, rows, props}) {
  return <section id={id} className="doc-section">
    <h2>{title}{props && <span>{rows.length}</span>}</h2>
    <div role="region" aria-label={title} className="table-wrap" tabIndex={0}>
      <table aria-label={title}><thead><tr>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(([key, type, value, description, required]) => <tr key={key}>
          <th scope="row">{props ? <code>{key}</code> : key}{required && <small>Обязательный</small>}</th>
          <td>{props ? <code>{type}</code> : type}</td><td>{value}</td><td>{description}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function Overview() {
  return <article className="overview">
    <div className="intro" data-enter>
      <p className="path">Документация / Обзор</p>
      <h1>Gutenberg<br />Kit<span>.</span></h1>
      <p className="summary">Справочник по компонентам WordPress и Next. Синтаксис, пропсы и готовые примеры для секций.</p>
      <Button size="lg" href="#Section" iconTrailing={ArrowDownRight}>Открыть справочник</Button>
    </div>
    <div className="blueprint">
      <div className="blueprint-label">СТРУКТУРА СЕКЦИИ</div>
      <a href="#Section"><Braces size={22} /> Section <ArrowUpRight size={17} /></a>
      <a href="#Heading"><CodeXml size={19} /> Heading <ArrowUpRight size={16} /></a>
      <a href="#Buttons"><CodeXml size={19} /> Buttons <ArrowUpRight size={16} /></a>
    </div>
    <div className="overview-links">
      {groups.map(group => {
        const first = entries.find(([category, name]) => category === group && !nested.has(name));
        return <a key={group} href={'#' + first[1]}>{group}<ArrowUpRight size={17} /></a>;
      })}
    </div>
  </article>;
}

function Reference({name, hash}) {
  const [group, , field, description] = byName.get(name);
  const rows = propRows(name);
  const editor = (settings[name] ?? []).filter(([key, type]) => type === 'Gutenberg' ||
    !key.split(' / ').some(prop => rows.some(([known]) => known === prop)));
  const scenario = usage[name];
  const links = [['syntax', 'Синтаксис'], ...(rows.length ? [['props', 'JSX-пропсы']] : []),
    ...(editor.length ? [['editor', 'В редакторе']] : []), ...(scenario ? [['usage', 'Пример']] : []),
    ...(children[name] || related[name] ? [['children', children[name] ? 'Дочерние' : 'Для вложения']] : [])];

  return <>
    <article className="reference" id={name}>
      <p className="path"><a href="./">Документация</a> / {group}{parents.has(name) && <> / <a href={'#' + parents.get(name)}>{parents.get(name)}</a></>}</p>
      <h1>{name}</h1>
      <p className="summary">{description}</p>
      <div className="field"><span>Поле</span> <code>{field}</code></div>
      <section id={name + '-syntax'} className="doc-section"><h2>Синтаксис</h2>
        <Snippet key={name} code={examples[name] ?? '<' + name + ' />'} />
      </section>
      {rows.length > 0 && <ReferenceTable id={name + '-props'} title="JSX-пропсы" props rows={rows} />}
      {editor.length > 0 && <ReferenceTable id={name + '-editor'} title="В редакторе Gutenberg" rows={editor} />}
      {scenario && <section id={name + '-usage'} className="doc-section">
        <h2>Пример использования</h2><h3>{scenario.title}</h3><p>{scenario.description}</p>
        {scenario.code && <Snippet key={name + '-example'} code={scenario.code} />}
        {scenario.link && <a href={'#' + scenario.link}>{scenario.link}</a>}
      </section>}
      {(children[name] || related[name]) && <section id={name + '-children'} className="doc-section">
        <h2>{children[name] ? 'Дочерние компоненты' : 'Компоненты для вложения'}</h2>
        <div className="child-list">{(children[name] ?? related[name]).map(child =>
          <a href={'#' + child} key={child}><code>{child}</code><ArrowUpRight size={17} /></a>)}</div>
      </section>}
    </article>
    <aside className="on-page"><nav aria-label="На этой странице">
      <strong>На этой странице</strong>
      {links.map(([id, label]) => <a key={id} aria-current={hash === name + '-' + id ? 'location' : undefined}
        href={'#' + name + '-' + id}>{label}</a>)}
    </nav></aside>
  </>;
}

function App() {
  const [hash, setHash] = useState(readHash);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [menu, setMenu] = useState(false);
  const search = useRef(null);
  const name = identifier(hash);
  const selected = byName.has(name) ? name : null;
  const term = query.trim().toLocaleLowerCase('ru');
  const matches = entry => (!filter || filter === entry[0]) &&
    [entry.join(' '), ...propRows(entry[1]).flat()].join(' ').toLocaleLowerCase('ru').includes(term);
  const visible = entries.filter(entry => (term || !nested.has(entry[1])) && matches(entry));

  function focusSearch() {
    setMenu(true);
    requestAnimationFrame(() => search.current?.focus());
  }

  useEffect(() => {
    const navigate = () => { setHash(readHash()); setMenu(false); };
    const shortcut = event => {
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey &&
        !event.target.closest('input, select, textarea, [contenteditable]')) {
        event.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('hashchange', navigate);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('keydown', shortcut);
    };
  }, []);
  useEffect(() => {
    if (hash.includes('-')) document.getElementById(hash)?.scrollIntoView();
    else window.scrollTo(0, 0);
    document.title = (selected ? selected + ' · ' : '') + 'Gutenberg Kit';
  }, [hash, selected]);

  function selectFirst(event) {
    if (event.key === 'Escape') setQuery('');
    if (event.key === 'Enter' && visible.length) {
      location.hash = visible[0][1];
      setMenu(false);
    }
  }
  function navLink(item, depth = 0) {
    return <a className={depth ? 'nested' : ''} href={'#' + item} key={item}
      aria-current={item === selected ? 'page' : undefined} onClick={() => setMenu(false)}>{item}</a>;
  }

  return <>
    <a className="skip" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main').focus(); }}>К содержимому</a>
    <Header onSearch={focusSearch} onMenu={() => setMenu(value => !value)} menuOpen={menu} />
    <div className="layout">
      <aside id="catalog-nav" className={'catalog' + (menu ? ' open' : '')} aria-label="Каталог">
        <div className="filters">
          <label className="search"><Search size={17} /><input ref={search} type="search" aria-label="Поиск по компонентам и пропсам" placeholder="Поиск по Kit" value={query}
            onChange={e => setQuery(e.target.value)} onKeyDown={selectFirst} aria-keyshortcuts="/" /><kbd>/</kbd></label>
          <select aria-label="Группа компонентов" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Все группы</option>{groups.map(group => <option key={group}>{group}</option>)}
          </select>
        </div>
        <nav aria-label="Компоненты">
          {visible.length === 0 && <p className="empty" role="status">Компоненты не найдены.</p>}
          {groups.map(group => {
            const items = visible.filter(entry => entry[0] === group);
            return items.length > 0 && <div className="nav-group" key={group}><h2>{group}</h2>
              {items.map(([, item]) => <div key={item}>{navLink(item)}
                {!term && (!filter || filter === group) && (item === selected || parents.get(selected) === item)
                  && (children[item] ?? []).flatMap(child => [navLink(child, 1),
                    ...(child === selected || parents.get(selected) === child ? (children[child] ?? []).map(part => navLink(part, 1)) : [])])}</div>)}
            </div>;
          })}
        </nav>
      </aside>
      <main id="main" tabIndex={-1}>{selected ? <Reference name={selected} hash={hash} /> : <Overview />}</main>
    </div>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
