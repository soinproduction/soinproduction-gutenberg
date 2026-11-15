import {Children, Fragment, isValidElement} from 'react';
import * as Kit from '../../index.tsx';
import {collectFields} from '../../schema/index.tsx';
import {componentModule} from '../module-info.js';

const photo = (name = 'architecture') => `./previews/${name}.png`;
const image = (name = 'architecture') => ({url: photo(name), alt: name === 'lamp' ? 'Настольная лампа на деревянном столе' : 'Светлый архитектурный фасад и оливковое дерево'});
const icon = path => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const icons = [
  {value:'custom:demo:spark',label:'Sparkles',set:'Demo',svg:icon('<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"/>')},
  {value:'custom:demo:layers',label:'Layers',set:'Demo',svg:icon('<path d="m12 3 10 6-10 6L2 9Z"/><path d="m2 13 10 6 10-6M2 17l10 6 10-6"/>')},
  {value:'custom:demo:arrow',label:'Arrow up right',set:'Demo',svg:icon('<path d="M7 17 17 7M7 7h10v10"/>')},
];
const recordFixtures = [
  {id:101,title:'Дом среди олив',excerpt:'Свет, натуральные материалы и пространство для жизни.',image:photo(),alt:image().alt,url:'#project-101',publishedAt:'2026-10-14T10:00:00Z',category:'Архитектура',extraBlocks:[{name:'core/paragraph',attrs:{content:'Внутри записи можно хранить и выводить собственные блоки.'},html:'<p>Внутри записи можно хранить и выводить собственные блоки.</p>'}]},
  {id:102,title:'Тёплый свет',excerpt:'Предметы, которые делают дом уютнее.',image:photo('lamp'),alt:image('lamp').alt,url:'#project-102',publishedAt:'2026-10-10T10:00:00Z',category:'Предметный дизайн'},
];
const siteFixtures = {
  icons, projects:recordFixtures,
  settings:{socialLinks:{instagram:'https://www.instagram.com/',telegram:'https://t.me/',linkedin:'https://www.linkedin.com/'}},
  tariffs:[{id:201,data:{id:'studio',name:'Студия · 1 час',price:1200,unit:'₴ / час',note:'Демонстрационный тариф',features:['Пространство для съёмки','Базовое оборудование','Выбор времени при записи']},buttons:[{name:'core/buttons',attrs:{},innerBlocks:[{name:'core/button',attrs:{text:'Выбрать время',url:'#booking-demo',className:'is-style-studio-accent'}}]}]}],
  reviews:[
    {id:301,image:'',text:'Здесь может быть отзыв о проекте — с именем автора и контекстом работы.',author:'Александр',note:'Демонстрационный отзыв'},
    {id:302,image:'',text:'Второй отзыв показывает, как карточки переключаются внутри карусели.',author:'Мария',note:'Демонстрационный отзыв'},
    {id:303,image:'',text:'Тексты, авторы и порядок записей приходят из выбранных в редакторе отзывов.',author:'Даниил',note:'Демонстрационный отзыв'},
  ],
  forms:[{id:401,data:{heading:'Обсудим вашу идею',submitLabel:'Отправить пример',columns:1,successAction:'message',successEyebrow:'Демонстрация',successTitle:'Всё получилось.',successMessage:'Данные остались в этом превью. Заявка никуда не отправлялась.',errorMessage:'Демонстрационная ошибка. Выберите «Успех» и попробуйте ещё раз.',fields:[{id:'name',type:'text',label:'Имя',placeholder:'Как к вам обращаться',required:true,showLabel:true},{id:'email',type:'email',label:'Email',placeholder:'name@example.com',required:true,showLabel:true},{id:'topic',type:'select',label:'Задача',placeholder:'Выберите задачу',showLabel:true,options:['Новый сайт','Развитие проекта','Поддержка']}]} }],
};
const features = [
  {title:'Понятная структура',description:'Важное находится с первого взгляда.'},
  {title:'Аккуратные детали',description:'Единые отступы, типографика и состояния.'},
  {title:'На любом экране',description:'Содержание сохраняется на мобильном.'},
  {title:'Удобно обновлять',description:'Редактируйте тексты прямо в WordPress.'},
];
const names = new Map(Object.entries(Kit).map(([name, Component]) => [Component, name]));

// The shown JSX is serialized from the same element tree the preview mounts.
export function toJSX(node, depth = 0) {
  const indent = '  '.repeat(depth);
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return indent + String(node);
  if (Array.isArray(node)) return node.map(child=>toJSX(child,depth)).filter(Boolean).join('\n');
  if (!isValidElement(node)) return '';
  if (node.type === Fragment) return `${indent}<>\n${toJSX(Children.toArray(node.props.children),depth+1)}\n${indent}</>`;
  const name = typeof node.type === 'string' ? node.type : names.get(node.type);
  if (!name) throw new Error('Unmapped preview component');
  const props = Object.entries(node.props).filter(([key,value])=>key!=='children' && value!==undefined && value!==false).map(([key,value]) => value===true ? key : typeof value==='string' ? `${key}=${JSON.stringify(value)}` : `${key}={${JSON.stringify(value)}}`);
  const attrs = !props.length ? '' : indent.length + name.length + props.join(' ').length < 76 ? ' '+props.join(' ') : '\n'+props.map(prop=>indent+'  '+prop).join('\n')+'\n'+indent;
  const children = Children.toArray(node.props.children);
  if (!children.length) return `${indent}<${name}${attrs} />`;
  if (children.length===1 && typeof children[0]==='string' && indent.length+name.length*2+attrs.length+children[0].length<84) return `${indent}<${name}${attrs}>${children[0]}</${name}>`;
  if (children.length===1 && typeof children[0]==='string') {
    const words=children[0].split(' '), lines=[]; let line='';
    for(const word of words){if(line.length+word.length>70-depth*2){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);
    return `${indent}<${name}${attrs}>\n${lines.map(line=>indent+'  '+line).join('\n')}\n${indent}</${name}>`;
  }
  return `${indent}<${name}${attrs}>\n${toJSX(children,depth+1)}\n${indent}</${name}>`;
}

export function buildExample(name, o) {
  let element, values={}, site={icons}, innerBlocks=[], note='', editor=false;
  const count=Number(o.count ?? 3);
  const picture=image(o.picture);
  switch(name) {
    case 'Section':
      element=<Kit.Section when="title" className="demo-section"><Kit.Heading name="title" /><Kit.Text name="description" /></Kit.Section>;
      values={title:o.visible?'Место для хороших идей.':'',description:'Одна секция объединяет заголовок, текст и остальные компоненты.'};
      note='when скрывает секцию, если поле пустое. Переключите видимость.';break;
    case 'Drag': case 'Cols': {
      const span=Number(o.span);
      element=<Kit.Drag name="content" grid={12} mobileGrid={6} gap={1}><Kit.Cols name="main" span={span} className="demo-card"><Kit.Heading name="title" level={3} /></Kit.Cols><Kit.Cols name="aside" span={12-span} className="demo-card"><Kit.Text name="description" /></Kit.Cols></Kit.Drag>;
      innerBlocks=[{name:'demo-column',attrs:{palette:'main'},innerBlocks:[{name:'demo-element',attrs:{element:'main:title',data:{title:'Главное'} }}]},{name:'demo-column',attrs:{palette:'aside'},innerBlocks:[{name:'demo-element',attrs:{element:'aside:description',data:{description:'Детали и контекст.'}}}]}];
      note='Результат сохранённых блоков Gutenberg. Перестановка блоков доступна в редакторе; здесь меняется сетка.';break;
    }
    case 'Area':
      element=<Kit.Area name="content" max={3} className="demo-stack"><Kit.Heading level={3} /><Kit.Text /></Kit.Area>;
      values={content:[{id:'a',type:'heading',value:'Свободная композиция.'},{id:'b',type:'text',value:'Редактор выбирает элементы из разрешённой палитры.'},{id:'c',type:'text',value:'Этот текст — ещё один элемент той же области.'}].slice(0,count)};
      note='Число элементов меняет демонстрационные данные области.';break;
    case 'Accordion': case 'AccordionItem': case 'AccordionTrigger': case 'AccordionContent':
      element=<Kit.Accordion mode={o.mode} multiple={o.multiple} firstOpen className="demo-accordion"><Kit.AccordionItem><Kit.AccordionTrigger>Что можно редактировать?</Kit.AccordionTrigger><Kit.AccordionContent>Тексты, изображения и порядок элементов. Структура остаётся в компоненте.</Kit.AccordionContent></Kit.AccordionItem><Kit.AccordionItem><Kit.AccordionTrigger>Как это работает на мобильном?</Kit.AccordionTrigger><Kit.AccordionContent>Содержание остаётся тем же, а раскладка адаптируется к ширине экрана.</Kit.AccordionContent></Kit.AccordionItem><Kit.AccordionItem><Kit.AccordionTrigger>Можно изменить оформление?</Kit.AccordionTrigger><Kit.AccordionContent>Да. Классы темы определяют типографику, отступы и цвета.</Kit.AccordionContent></Kit.AccordionItem></Kit.Accordion>;
      note=name==='Accordion'?'Открывайте пункты или переключите режим вкладок.':`${name} показан внутри Accordion: это часть общей структуры.`;break;
    case 'Heading':element=<Kit.Heading name="title" level={Number(o.level)} />;values={title:o.text};note='Уровень меняет HTML-тег и его типографику.';break;
    case 'Text':element=<Kit.Text name="description" />;values={description:o.text};note='Содержание поля приходит из данных секции.';break;
    case 'Paragraphs':element=<Kit.Paragraphs name="paragraphs" paragraphClassName="demo-paragraph" />;values={paragraphs:['Хорошая страница начинается с понятной задачи.','Разделите мысль на короткие абзацы. Так текст легче читать.','Здесь можно добавить ссылку, выделение и продолжение истории.'].slice(0,count)};note='Каждый абзац — отдельная строка данных.';break;
    case 'Toggle':
      element=<Kit.Toggle name="showIntro" label="Показать описание" default><Kit.Text name="description" /></Kit.Toggle>;values={showIntro:o.visible,description:'Это описание видно, пока переключатель включён.'};note='Toggle — настройка инспектора. На сайте он управляет вложенным содержимым.';break;
    case 'Choice':
      element=<><Kit.Choice name="layout" label="Содержание" choices={{studio:'Студия',project:'Проект'}} /><Kit.Show when="layout" is="studio"><Kit.Heading name="studioTitle" /></Kit.Show><Kit.Show when="layout" is="project"><Kit.Heading name="projectTitle" /></Kit.Show></>;
      values={layout:o.choice,studioTitle:'Сначала — идея.',projectTitle:'Затем — проект.'};note='Choice ничего не рисует на сайте. Его значение использует Show; выбор выше имитирует инспектор.';break;
    case 'Show':element=<Kit.Show when="description"><Kit.Text name="description" /></Kit.Show>;values={description:o.visible?'Текст появляется, когда поле заполнено.':''};note='Пустое значение скрывает вложенную разметку.';break;
    case 'Background':element=<section className="demo-background"><Kit.Background name="background" className="demo-background-image" /><div><h3>Пространство для идей.</h3><p>Изображение работает фоном секции.</p></div></section>;values={background:{type:'image',image:picture.url,alt:''}};note='Изображение и контент остаются отдельными слоями.';break;
    case 'Image':element=<Kit.Image name="image" width={640} height={400} className="demo-image" />;values={image:picture.url};note='width и height задают пропорции; размер в макете определяет CSS.';break;
    case 'Media':element=<Kit.Media name="media" />;values={media:{kind:'sp-media',attachment_id:501,media_type:'image',source:'library',display:o.display,url:new URL(picture.url,location.href).href,alt:picture.alt,title:'Пример медиа'}};note='В режиме «В окне» нажмите изображение. Escape закрывает просмотр.';break;
    case 'Icon':element=<Kit.Icon name="icon" default={`custom:demo:${o.icon}`} className="demo-icon" />;values={icon:`custom:demo:${o.icon}`};note='SVG приходит из site.icons. В проекте это каталог подключённых иконок.';break;
    case 'Gallery':element=<Kit.Gallery name="gallery" max={3} className="demo-gallery" />;values={gallery:[image(),image('lamp'),image()].slice(0,count)};note='Набор изображений из медиатеки; max ограничивает выбор в редакторе.';break;
    case 'Slider': case 'SliderButton': case 'SliderPagination':
      element=<section className="demo-slider"><Kit.Slider name="projects" loop={o.loop} label="Проекты"><Kit.List name="slides"><article className="demo-slide"><Kit.Image name="image" className="demo-image" /><Kit.Heading name="title" level={3} /></article></Kit.List></Kit.Slider><div className="demo-slider-controls"><Kit.SliderButton slider="projects" direction="previous" label="Предыдущий слайд" /><Kit.SliderPagination slider="projects" label="Страницы слайдера" pageLabel="Слайд" /><Kit.SliderButton slider="projects" label="Следующий слайд" /></div></section>;
      values={slides:[{image:photo(),title:'Дом среди олив'},{image:photo('lamp'),title:'Тёплый свет'},{image:photo(),title:'Детали пространства'}]};note='Листайте стрелками, точками или перетаскиванием. Кнопки связаны с Slider через name.';break;
    case 'Button':element=<Kit.Button name="cta" style={o.style} />;values={cta:{text:'Обсудить проект',url:'#demo-action',icon:'custom:demo:arrow'}};note='Кнопка использует настоящий рендер Kit. Переход перехвачен внутри демонстрации.';break;
    case 'Buttons':element=<Kit.Buttons name="actions" max={2} styles={['accent','outline']} className="demo-actions" />;values={actions:[{text:'Начать проект',url:'#demo-action',icon:'custom:demo:arrow'},{text:'Посмотреть работы',url:'#demo-work'}].slice(0,count)};note='В каждой строке данных — текст, действие и оформление кнопки.';break;
    case 'SocialLinks':element=<Kit.SocialLinks buttonStyle={o.style} className="demo-actions" />;site={...siteFixtures};note='Ссылки берутся из site.settings.socialLinks. В демонстрации переходы перехвачены.';break;
    case 'List':
      element=<Kit.List name="features" max={4} perPage={2} loading={o.loading==='all'?undefined:o.loading} displaySettings className="demo-stack"><article className="demo-list-card"><Kit.Heading name="title" level={3} /><Kit.Text name="description" /></article></Kit.List>;
      values={features,featuresDisplay:{button:{text:'Показать ещё',style:'outline'}}};note='Попробуйте «Показать ещё» или страницы. Список использует настоящую логику Kit.';break;
    case 'Records':element=<Kit.Records name="projects" type="project" className="demo-records"><article className="demo-record"><Kit.RecordImage /><Kit.RecordTitle /><Kit.RecordExcerpt /><Kit.RecordLink>Открыть проект</Kit.RecordLink></article></Kit.Records>;values={projects:[101,102].slice(0,count)};site={...siteFixtures};note='Данные выбранных записей приходят из site.projects.';break;
    case 'RecordLink':case 'RecordImage':case 'RecordText':case 'RecordTitle':case 'RecordExcerpt':case 'RecordContent':case 'RecordDate':case 'RecordIndex':case 'RecordEdit': {
      const target={RecordLink:<Kit.RecordLink>Открыть проект</Kit.RecordLink>,RecordImage:<Kit.RecordImage className="demo-image" />,RecordText:<Kit.RecordText field="category" />,RecordTitle:<Kit.RecordTitle />,RecordExcerpt:<Kit.RecordExcerpt />,RecordContent:<Kit.RecordContent field="extraBlocks" />,RecordDate:<Kit.RecordDate />,RecordIndex:<Kit.RecordIndex className="demo-index" />,RecordEdit:<Kit.RecordEdit label="Редактировать запись" />}[name];
      element=<Kit.Records name="projects" type="project" className="demo-stack">{target}</Kit.Records>;values={projects:name==='RecordIndex'?[101,102]:[101]};site={...siteFixtures};editor=name==='RecordEdit' && o.editor;
      note=name==='RecordEdit'?'Ссылка существует только в редакторе Gutenberg. Здесь показан её демо-контрол; сайт её не выводит.':`${name} читает текущую запись внутри Records.`;break;
    }
    case 'PricingPlans':element=<Kit.PricingPlans name="plans" className="demo-pricing" />;values={plans:[201]};site={...siteFixtures};note='Тариф принадлежит модулю booking. Цена и условия здесь — демонстрационные данные.';break;
    case 'ReviewsCarousel':element=<Kit.ReviewsCarousel name="reviews" className="demo-reviews" labels={{previous:'Предыдущий отзыв',next:'Следующий отзыв',carousel:'Отзывы',pages:'Страница'}} />;values={reviews:[301,302,303]};site={...siteFixtures};note='Листайте отзывы кнопками или перетаскиванием. Тексты и имена — демонстрационные.';break;
    case 'Form':element=<Kit.Form name="contact" className="demo-form" />;values={contact:401};site={...siteFixtures,runtime:{formsEndpoint:new URL('./__preview/forms/',location.href).href}};note='Живая форма модуля forms. Локальный демо-ответ: данные не отправляются и не сохраняются.';break;
    default:throw new Error(`No live preview for ${name}`);
  }
  const requiredSiteKeys = ['Button','Buttons','Icon'].includes(name) ? ['icons'] : name==='SocialLinks' ? ['settings'] : name.startsWith('Record') ? ['projects'] : name==='PricingPlans' ? ['tariffs'] : name==='ReviewsCarousel' ? ['reviews'] : name==='Form' ? ['forms','runtime'] : [];
  site=Object.fromEntries(requiredSiteKeys.filter(key=>site[key]).map(key=>[key,site[key]]));
  const schema=collectFields(element);
  return {element,values,site,innerBlocks,schema,note,editor,code:toJSX(element),module:componentModule[name],enabled:o.enabled!==false};
}
