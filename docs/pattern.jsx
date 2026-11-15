import {createRoot} from 'react-dom/client';
import {Action, ArrowRight, ArrowUpRight, Breadcrumbs, CodeBlock, DocFooter, DocsShell, github, MobileOutline, PageOutline} from './components';
import './reference.css';

const links = [['principle', 'Общий принцип'], ['fields', 'Поля и данные'], ['classes', 'Классы по контексту'], ['collections', 'Коллекции']];

createRoot(document.getElementById('root')).render(<DocsShell pattern>
  <article className="reference guide"><Breadcrumbs items={[["Паттерн компонентов"]]} />
    <div className="reference-intro"><h1>Паттерн<br />компонентов Kit</h1><p className="summary">Поле, данные и разметка — общий подход к созданию компонентов для редактора и сайта.</p></div><MobileOutline links={links} />
    <section className="doc-section" id="principle"><h2>Общий принцип</h2><p>Для обычного поля используйте <code>kit(kind, describeField, render)</code>. Для составного компонента опишите <code>field</code> рядом с разметкой и используйте <code>useClasses</code> для объединения трёх вариантов классов.</p></section>
    <section className="doc-section" id="fields"><h2>Поля и данные</h2><ul className="definition-list"><li><code>name</code><span>Ключ сохранённых данных.</span></li><li><code>label</code><span>Подпись в редакторе.</span></li><li><code>useField(name)</code><span>Даёт значение и <code>setValue</code>.</span></li><li><code>useValues()</code><span>Читает соседние поля.</span></li><li><code>useSite()</code><span>Читает общие данные сайта.</span></li></ul></section>
    <section className="doc-section" id="classes"><h2>Классы по контексту</h2><p><code>className</code> применяется везде, <code>adminClassName</code> добавляется в Gutenberg, <code>frontClassName</code> добавляется на сайте.</p><CodeBlock title="component.tsx" code={'<Buttons\n  name="actions"\n  label="Действия"\n  className="flex gap-4"\n  adminClassName="outline"\n  frontClassName="mt-preset-40"\n/>'} /></section>
    <section className="doc-section" id="collections"><h2>Коллекции</h2><p><a href="./#List">List</a> собирает схему строки из детей. <a href="./#Records">Records</a> выбирает записи и передаёт контекст дочерним <code>Record*</code>.</p><div className="guide-actions"><Action href="./#List" icon={ArrowRight}>Открыть List</Action><Action href="./#Records" icon={ArrowRight}>Открыть Records</Action></div></section>
    <div className="guide-source"><h2>Дальше — к реализации</h2><p>Полный паттерн и подробности интеграции находятся в репозитории.</p><Action href={`${github}/blob/main/docs/PATTERN.md`} variant="black" icon={ArrowUpRight}>Полная инструкция</Action></div><DocFooter />
  </article><PageOutline links={links} />
</DocsShell>);
