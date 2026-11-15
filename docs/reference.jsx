import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {entries, examples, children, related, byName, propRows} from './catalog';
import {settings} from './settings';
import {usage} from './usage';
import {Action, ArrowLeft, ArrowRight, ArrowUpRight, Breadcrumbs, Braces, CodeBlock, CodeXml, DocFooter, DocsShell, FileCode2, groupIcons, groups, MobileOutline, PageOutline, parents} from './components';
import './reference.css';

const readHash = () => location.hash.slice(1);
const identifier = hash => hash.split('-')[0];
const demoExamples = [
  {name: 'Section', label: 'Секция', code: '<Section className="py-section">\n  <Heading name="title" level={2} />\n  <Text name="description" />\n  <Buttons name="actions" max={2} />\n</Section>'},
  {name: 'Cols', label: 'Колонки', code: '<Drag name="content" grid={12}>\n  <Cols name="main" span={8}>\n    <Heading name="title" />\n  </Cols>\n  <Cols name="aside" span={4}>\n    <Text name="description" />\n  </Cols>\n</Drag>'},
  {name: 'List', label: 'Список', code: '<List name="features" max={4}>\n  <article>\n    <Heading name="title" level={3} />\n    <Text name="description" />\n  </article>\n</List>'},
];

function SectionDemo() {
  const [active, setActive] = useState(0); const demo = demoExamples[active];
  function tabKeys(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    setActive(next); document.getElementById(`demo-tab-${next}`).focus();
  }
  return <section className="workbench" aria-label="Как устроены компоненты">
    <div className="workbench-toolbar"><div role="tablist" aria-label="Примеры структуры">{demoExamples.map(({label}, index) => <button key={label} id={`demo-tab-${index}`} type="button" role="tab" aria-selected={active === index} aria-controls="demo-panel" tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => tabKeys(event, index)}>{label}</button>)}</div><span className="workbench-note"><Braces size={16} />JSX → структура</span></div>
    <div className="workbench-content" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${active}`}>
      <CodeBlock key={demo.name} code={demo.code} title="section.tsx" tone="dark" />
      <div className="structure-preview"><div className="preview-top"><span className="preview-dots" aria-hidden="true"><i /><i /><i /></span><span>Предпросмотр структуры</span></div>
        <div className={`preview-canvas preview-canvas--${demo.name.toLowerCase()}`}>
          {active === 0 && <div className="preview-section"><span className="component-tag">Section</span><div className="preview-heading"><span>Ваш следующий<br />большой проект.</span><code>Heading</code></div><div className="preview-description">Содержание редактируется в WordPress.<br /> Разметка остаётся в вашем компоненте.<code>Text</code></div><div className="preview-buttons"><span>Обсудить проект<ArrowUpRight size={14} /></span><code>Buttons</code></div></div>}
          {active === 1 && <div className="preview-columns"><span className="component-tag">Drag · grid=12</span><div className="preview-col"><code>Cols · span=8</code><strong>Место для<br />главного.</strong><span>Heading</span></div><div className="preview-col"><code>Cols · span=4</code><p>Контекст,<br />детали<br />и полезные<br />ссылки.</p><span>Text</span></div></div>}
          {active === 2 && <div className="preview-list"><span className="component-tag">List · max=4</span>{['Продумать структуру', 'Добавить содержание', 'Настроить оформление'].map((title, index) => <div className="preview-list-row" key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><small>Heading + Text</small></div><ArrowUpRight size={16} /></div>)}</div>}
        </div><a className="preview-reference" href={`#${demo.name}`}>Открыть {demo.name}<ArrowRight size={16} /></a>
      </div>
    </div>
  </section>;
}

function Overview() {
  return <article className="overview"><Breadcrumbs items={[["Обзор"]]} />
    <div className="overview-heading"><div><h1>Gutenberg Kit<span className="heading-dot">.</span></h1><p className="summary">От JSX до редактора WordPress.<br />Компоненты, пропсы и примеры — в одном справочнике.</p></div><Action href="#Section" variant="orange" icon={ArrowRight}>Начать с Section</Action></div>
    <SectionDemo />
    <div className="overview-section-heading"><div><h2>Найдите нужный компонент</h2><p>От простой строки текста до вложенных коллекций.</p></div><span>{entries.length} компонентов</span></div>
    <div className="category-directory">{groups.map(group => { const Icon = groupIcons[group]; const items = entries.filter(([category]) => category === group); return <section className="category" key={group}><div className="category-heading"><span className="category-icon"><Icon size={22} /></span><h3>{group}</h3><span>{items.length}</span></div><div className="category-links">{items.map(([, name]) => <a key={name} href={`#${name}`}>{name}<ArrowUpRight size={12} /></a>)}</div></section>; })}</div>
    <a className="pattern-callout" href="./pattern.html"><span className="pattern-icon"><FileCode2 size={28} /></span><div><h2>Создаёте свой компонент?</h2><p>Разберите общий паттерн: поле, данные и разметка.</p></div><span className="callout-action">Читать инструкцию<ArrowUpRight size={20} /></span></a><DocFooter />
  </article>;
}

function ReferenceTable({id, title, rows, props}) {
  const labels = ['Параметр', 'Тип', 'По умолчанию', 'Что меняет'];
  return <section id={id} className="doc-section"><h2>{title}<span className="count-badge">{rows.length}</span><a className="heading-anchor" href={`#${id}`} aria-label={`Ссылка на раздел ${title}`}>#</a></h2>
    <div className="table-wrap" role="region" aria-label={title} tabIndex={0}><table><thead><tr>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(([key, type, value, description, required]) => <tr key={key}><th scope="row">{props ? <code>{key}</code> : key}{required && <span className="required">Обязательный</span>}</th><td data-label="Тип">{props ? <code>{type}</code> : type}</td><td data-label="По умолчанию">{value}</td><td data-label="Что меняет">{description}</td></tr>)}</tbody></table></div>
  </section>;
}

function Reference({name, hash}) {
  const [group, , field, description] = byName.get(name); const rows = propRows(name);
  const editor = (settings[name] ?? []).filter(([key, type]) => type === 'Gutenberg' || !key.split(' / ').some(prop => rows.some(([known]) => known === prop)));
  const scenario = usage[name];
  const links = [[name + '-syntax', 'Синтаксис'], ...(rows.length ? [[name + '-props', 'JSX-пропсы']] : []), ...(editor.length ? [[name + '-editor', 'В редакторе Gutenberg']] : []), ...(scenario ? [[name + '-usage', 'Пример использования']] : []), ...(children[name] || related[name] ? [[name + '-children', children[name] ? 'Дочерние компоненты' : 'Компоненты для вложения']] : [])];
  const [active, setActive] = useState(hash);
  useEffect(() => { const update = () => { const passed = links.map(([id]) => document.getElementById(id)).filter(node => node && node.getBoundingClientRect().top < 180); setActive(passed.at(-1)?.id ?? links[0][0]); }; update(); window.addEventListener('scroll', update, {passive: true}); return () => window.removeEventListener('scroll', update); }, [name]);
  const position = entries.findIndex(([, item]) => item === name); const previous = entries[position - 1]; const next = entries[position + 1];
  return <><article className="reference" id={name}>
    <Breadcrumbs items={[[group], ...(parents.has(name) ? [[parents.get(name), `#${parents.get(name)}`]] : []), [name]]} />
    <div className="reference-intro"><div className="reference-title"><h1>{name}</h1><span className="component-symbol"><CodeXml size={28} /></span></div><p className="summary">{description}</p><div className="field"><span>Поле данных</span><code>{field}</code></div></div>
    <MobileOutline links={links} />
    <section id={`${name}-syntax`} className="doc-section"><h2>Синтаксис<a className="heading-anchor" href={`#${name}-syntax`} aria-label="Ссылка на синтаксис">#</a></h2><CodeBlock key={name} code={examples[name] ?? `<${name} />`} /></section>
    {rows.length > 0 && <ReferenceTable id={`${name}-props`} title="JSX-пропсы" props rows={rows} />}
    {editor.length > 0 && <ReferenceTable id={`${name}-editor`} title="В редакторе Gutenberg" rows={editor} />}
    {scenario && <section id={`${name}-usage`} className="doc-section usage-section"><h2>Пример использования<a className="heading-anchor" href={`#${name}-usage`} aria-label="Ссылка на пример использования">#</a></h2><h3>{scenario.title}</h3><p>{scenario.description}</p>{scenario.code && <CodeBlock key={`${name}-example`} code={scenario.code} title="example.tsx" />}{scenario.link && <a className="text-link" href={`#${scenario.link}`}>{scenario.link}<ArrowRight size={16} /></a>}</section>}
    {(children[name] || related[name]) && <section id={`${name}-children`} className="doc-section"><h2>{children[name] ? 'Дочерние компоненты' : 'Компоненты для вложения'}</h2><div className="child-list">{(children[name] ?? related[name]).map(child => <a key={child} href={`#${child}`}><span className="child-symbol"><CodeXml size={18} /></span><div><strong>{child}</strong><p>{byName.get(child)?.[3]}</p></div><ArrowUpRight size={18} /></a>)}</div></section>}
    <nav className="page-pagination" aria-label="Соседние компоненты">{previous ? <a href={`#${previous[1]}`}><ArrowLeft size={18} /><span><small>Предыдущий</small>{previous[1]}</span></a> : <a href="./"><ArrowLeft size={18} /><span><small>Документация</small>Обзор</span></a>}{next && <a href={`#${next[1]}`}><span><small>Следующий</small>{next[1]}</span><ArrowRight size={18} /></a>}</nav><DocFooter />
  </article><PageOutline links={links} active={active} /></>;
}

function App() {
  const [hash, setHash] = useState(readHash); const selected = byName.has(identifier(hash)) ? identifier(hash) : null;
  useEffect(() => { const navigate = () => setHash(readHash()); window.addEventListener('hashchange', navigate); return () => window.removeEventListener('hashchange', navigate); }, []);
  useEffect(() => { requestAnimationFrame(() => { if (hash.includes('-') && selected) document.getElementById(hash)?.scrollIntoView(); else window.scrollTo(0, 0); }); document.title = (selected ? `${selected} · ` : '') + 'Gutenberg Kit · Документация'; }, [hash, selected]);
  return <DocsShell selected={selected}>{selected ? <Reference key={selected} name={selected} hash={hash} /> : <Overview />}</DocsShell>;
}
createRoot(document.getElementById('root')).render(<App />);
