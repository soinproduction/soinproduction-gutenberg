const select = (key, label, values, fallback) => ({key, label, type: 'select', values, fallback});
const toggle = (key, label, fallback = true) => ({key, label, type: 'checkbox', fallback});
const text = (key, label, fallback) => ({key, label, type: 'text', fallback});
const count = select('count', 'Элементов', [['1','1'],['2','2'],['3','3']], '3');
const mode = select('mode', 'Режим', [['accordion','Аккордеон'],['tabs','Вкладки']], 'accordion');
const picture = select('picture', 'Изображение', [['architecture','Архитектура'],['lamp','Предметный дизайн']], 'architecture');
export const controls = {
  Section: [toggle('visible', 'Секция видна')],
  Drag: [select('span','Колонки', [['8','8 / 4'],['6','6 / 6']], '8')],
  Cols: [select('span','Колонки', [['8','8 / 4'],['6','6 / 6']], '8')],
  Area: [count],
  Accordion: [mode, toggle('multiple', 'Несколько открытых', false)],
  AccordionItem: [mode], AccordionTrigger: [mode], AccordionContent: [mode],
  Show: [toggle('visible','Есть значение')],
  Heading: [select('level','Уровень', [['2','H2'],['3','H3'],['4','H4']], '2'), text('text','Текст','Место для хороших идей.')],
  Text: [text('text','Текст','Продуманные детали делают повседневные задачи проще.')],
  Paragraphs: [count],
  Toggle: [toggle('visible','Показать описание')],
  Choice: [select('choice','Значение в инспекторе', [['studio','Студия'],['project','Проект']], 'studio')],
  Background: [picture], Image: [picture],
  Media: [picture, select('display','Показ', [['inline','На странице'],['popup','В окне']], 'popup')],
  Icon: [select('icon','Иконка', [['spark','Sparkles'],['layers','Layers'],['arrow','Arrow up right']], 'spark')],
  Gallery: [count],
  Slider: [toggle('loop','Цикл', false)], SliderButton: [toggle('loop','Цикл', false)], SliderPagination: [toggle('loop','Цикл', false)],
  Button: [select('style','Стиль', [['accent','Оранжевая'],['outline','Белая'],['primary','Чёрная']], 'accent')],
  Buttons: [select('count','Кнопок', [['1','1'],['2','2']], '2')],
  SocialLinks: [select('style','Стиль', [['text','Текст'],['outline','Белая'],['primary','Чёрная']], 'text')],
  Form: [toggle('enabled','Модуль forms подключён'), select('result','Ответ демо', [['success','Успех'],['error','Ошибка']], 'success')],
  List: [select('loading','Вывод', [['show-more','Показать ещё'],['pagination','Пагинация'],['all','Весь список']], 'show-more')],
  Records: [select('count','Записей', [['1','1'],['2','2']], '2')],
  RecordEdit: [toggle('editor','Режим редактора')],
  PricingPlans: [toggle('enabled','Модуль booking подключён')],
};
export function initialOptions(name) { return Object.fromEntries((controls[name] ?? []).map(({key,fallback})=>[key,fallback])); }
