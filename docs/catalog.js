import { settings } from './settings.js';
import { jsxProps } from './props.js';
const entries = [
['Разметка','Section','Якорь sectionId добавляет схема секции','Корневой section. when скрывает секцию на сайте, если поле пустое.'],
['Разметка','Drag','custom · kit-drag','Нативные вложенные блоки Gutenberg. allow расширяет меню вставки. grid, mobileGrid и gap задают раскладку.'],
['Разметка','Cols','Собственного поля нет','Объявляет колонку внутри Drag. name идентифицирует колонку, span задаёт ширину.'],
['Разметка','Area','custom · kit-area, массив','Свободная область с разрешёнными дочерними компонентами. type различает варианты одного компонента.'],
['Разметка','Accordion','Собственного поля нет','Настройки открытия, режима, иконки и адаптива задаются пропсами. Внутренний Records или List отвечает за данные.'],
['Разметка','AccordionItem','Собственного поля нет','Один пункт раскрывающегося списка или вкладка.'],
['Разметка','AccordionTrigger','Собственного поля нет','Заголовок и переключатель пункта.'],
['Разметка','AccordionContent','Собственного поля нет','Содержимое пункта.'],
['Разметка','Show','Собственного поля нет','Выводит детей, если значение when соответствует is.'],
['Контент','Heading','richText','Один заголовок. level выбирает h1–h4, по умолчанию h2.'],
['Контент','Text','richText','Один текстовый блок. settings переносит редактирование в настройки, placeholder задаёт подсказку.'],
['Контент','Paragraphs','wysiwyg, массив','Список абзацев. paragraphClassName применяется к отдельному абзацу.'],
['Контент','Toggle','toggle, boolean','Переключатель в инспекторе. Может оборачивать условную разметку.'],
['Контент','Choice','select','Выбор из choices в инспекторе. По умолчанию используется первый ключ.'],
['Медиа','Background','custom · background','Фоновое изображение или видео, выбирается в инспекторе. CSS секции задаёт размещение.'],
['Медиа','Image','image','Изображение из медиатеки с альтернативным текстом. width и height задают размеры.'],
['Медиа','Media','media','Изображение или видео и параметры показа.'],
['Медиа','Icon','icon','Идентификатор из каталога иконок. default задаёт начальное значение.'],
['Медиа','Gallery','gallery, массив','Галерея изображений. max ограничивает число элементов.'],
['Медиа','Slider','gallery без детей','Без детей редактирует изображения. С детьми оборачивает List или Records и использует их поля.'],
['Медиа','SliderButton','Собственного поля нет','Кнопка навигации слайдера.'],
['Медиа','SliderPagination','Собственного поля нет','Индикаторы страниц слайдера.'],
['Ссылки и формы','Button','link','Текст, действие и иконка. style задаёт оформление.'],
['Ссылки и формы','Buttons','buttons, массив','Список действий. max задаёт лимит, styles — стартовые стили по позициям.'],
['Ссылки и формы','SocialLinks','Собственного поля нет','Старый рендер текстовых ссылок из словаря settings.socialLinks.'],
['Ссылки и формы','Form','custom · form-selection','Выбор сохранённой формы из инспектора. Поле необязательное.'],
['Коллекции','List','repeater, массив объектов','Список ручных строк. Поля строки собираются из дочерних компонентов.'],
['Коллекции','Records','relationship, массив ID и ручных объектов','Выбор и порядок записей по type. manual включает добавление локальных карточек, max задаёт лимит.'],
['Коллекции','RecordLink','Собственного поля нет','Ссылка из URL текущей записи.'],
['Коллекции','RecordImage','Собственного поля нет','Изображение записи. Для ручной карточки в Gutenberg доступны настройки изображения и ссылки.'],
['Коллекции','RecordText','Собственного поля нет','Вывод свойства field текущей записи. У ручной карточки текст редактируется на холсте.'],
['Коллекции','RecordTitle','Собственного поля нет','Заголовок записи. Проп as меняет тег.'],
['Коллекции','RecordExcerpt','Собственного поля нет','Краткое описание записи.'],
['Коллекции','RecordContent','Собственного поля нет','Вложенные блоки записи из свойства field.'],
['Коллекции','RecordDate','Собственного поля нет','Дата записи из publishedAt или date.'],
['Коллекции','RecordIndex','Собственного поля нет','Номер записи в текущем списке.'],
['Коллекции','RecordEdit','Собственного поля нет','Ссылка на редактирование связанной записи в Gutenberg.'],
['Коллекции','PricingPlans','custom · tariff-selection','Выбор тарифов и их порядок. Редактирование тарифов находится в админке.'],
['Коллекции','ReviewsCarousel','custom · review-selection','Выбор отзывов для карусели.'],
];
const examples = {
  "Heading": "<Heading name=\"heading\" className=\"mt-preset-30\" />",
  "Text": "<Text name=\"text\" className=\"mt-preset-30\" />",
  "Paragraphs": "<Paragraphs name=\"paragraphs\" className=\"mt-preset-30\" />",
  "Background": "<Background name=\"background\" className=\"mt-preset-30\" />",
  "Image": "<Image name=\"image\" className=\"mt-preset-30\" />",
  "Media": "<Media name=\"media\" className=\"mt-preset-30\" />",
  "Gallery": "<Gallery name=\"gallery\" className=\"mt-preset-30\" />",
  "Icon": "<Icon name=\"icon\" className=\"mt-preset-30\" />",
  "Form": "<Form name=\"form\" className=\"mt-preset-30\" />",
  "PricingPlans": "<PricingPlans name=\"pricingPlans\" className=\"mt-preset-30\" />",
  "ReviewsCarousel": "<ReviewsCarousel name=\"reviewsCarousel\" className=\"mt-preset-30\" />",
  "Section": "<Section className=\"py-section\" adminClassName=\"outline\" frontClassName=\"motion-stagger\">\n  <Heading name=\"title\" />\n</Section>",
  "Drag": "<Drag name=\"content\" allow={['core/paragraph']}>\n  <Heading name=\"title\" />\n  <Buttons name=\"actions\" initial={false} />\n</Drag>",
  "Cols": "<Drag name=\"content\" grid={12}>\n  <Cols name=\"main\" span={8} adminClassName=\"outline\">\n    <Heading name=\"title\" />\n  </Cols>\n</Drag>",
  "Area": "<Area name=\"content\" max={5}>\n  <Text />\n  <Image />\n</Area>",
  "Accordion": "<Accordion firstOpen>\n  <Records name=\"questions\" type=\"faq\" manual>\n    <AccordionItem>\n      <AccordionTrigger><RecordText field=\"question\" /></AccordionTrigger>\n      <AccordionContent><RecordText field=\"answer\" /></AccordionContent>\n    </AccordionItem>\n  </Records>\n</Accordion>",
  "AccordionItem": "<AccordionItem className=\"border-b\">\n  <AccordionTrigger>Вопрос</AccordionTrigger>\n  <AccordionContent>Ответ</AccordionContent>\n</AccordionItem>",
  "AccordionTrigger": "<AccordionTrigger className=\"cursor-pointer\">Вопрос</AccordionTrigger>",
  "AccordionContent": "<AccordionContent className=\"pb-6\">Ответ</AccordionContent>",
  "Show": "<Show when=\"layout\" is=\"grid\" className=\"grid gap-4\">\n  <Text name=\"description\" />\n</Show>",
  "Toggle": "<Toggle name=\"showIntro\" label=\"Показать вступление\" default>\n  <Text name=\"intro\" />\n</Toggle>",
  "Choice": "<Choice name=\"layout\" label=\"Вид\" choices={{ grid: \"Сетка\", list: \"Список\" }} />",
  "Slider": "<Slider name=\"slides\" label=\"Фотографии\" max={8} />",
  "SliderButton": "<SliderButton slider=\"slides\" direction=\"previous\" className=\"border\" />",
  "SliderPagination": "<SliderPagination slider=\"slides\" className=\"flex gap-2\" />",
  "Button": "<Button name=\"cta\" label=\"Кнопка\" style=\"accent\" frontClassName=\"w-full\" />",
  "Buttons": "<Buttons\n  name=\"actions\"\n  label=\"Действия\"\n  max={2}\n  styles={['accent', 'outline']}\n  className=\"flex flex-wrap gap-preset-20\"\n  adminClassName=\"outline\"\n/>",
  "Records": "<Records manual name=\"questions\" type=\"faq\" label=\"Вопросы\" className=\"grid gap-4\">\n  <article>\n    <RecordIndex />\n    <RecordText field=\"question\" as=\"span\" />\n    <RecordText field=\"answer\" />\n    <RecordEdit label=\"Редактировать\" />\n  </article>\n</Records>",
  "SocialLinks": "<SocialLinks className=\"flex gap-3\" buttonStyle=\"text\" />",
  "List": "<List name=\"features\" max={6} className=\"grid gap-4\">\n  <article><Heading name=\"title\" /><Text name=\"description\" /></article>\n</List>",
  "RecordLink": "<RecordLink className=\"underline\"><RecordTitle /></RecordLink>",
  "RecordText": "<RecordText field=\"question\" as=\"span\" adminClassName=\"outline\" />",
  "RecordContent": "<RecordContent field=\"extraBlocks\" className=\"space-y-4\" />",
  "RecordEdit": "<RecordEdit label=\"Редактировать запись\" adminClassName=\"mt-3\" />",
  "RecordImage": "<RecordImage className=\"text-sm\" />",
  "RecordTitle": "<RecordTitle className=\"text-sm\" />",
  "RecordExcerpt": "<RecordExcerpt className=\"text-sm\" />",
  "RecordDate": "<RecordDate className=\"text-sm\" />",
  "RecordIndex": "<RecordIndex className=\"text-sm\" />"
};
const children = {
  Drag: ['Cols'],
  Accordion: ['AccordionItem'],
  AccordionItem: ['AccordionTrigger', 'AccordionContent'],
  Slider: ['SliderButton', 'SliderPagination'],
  Records: ['RecordLink', 'RecordImage', 'RecordText', 'RecordTitle', 'RecordExcerpt', 'RecordContent', 'RecordDate', 'RecordIndex', 'RecordEdit'],
};
const byName = new Map(entries.map(entry => [entry[1], entry]));
const nested = new Set(Object.values(children).flat());
const related = {
  List: ['Heading', 'Text', 'Image'],
  Area: ['Heading', 'Text', 'Image', 'Buttons'],
};
const commonPropNotes = {
  className: 'Классы в редакторе и на сайте.',
  adminClassName: 'Дополнительные классы в редакторе.',
  frontClassName: 'Дополнительные классы на сайте.',
  initial: 'Внутри Drag: false оставляет элемент в меню вставки и исключает его из начальной раскладки.',
  name: 'Имя поля или идентификатор компонента.',
  label: 'Подпись поля или доступное название контрола.',
  children: 'Вложенная JSX-разметка.',
  buttonPosition: 'Положение кнопки добавления.',
  buttonText: 'Подпись кнопки добавления.',
};
const splitDefaults = {
  Drag: { grid: '0', mobileGrid: '6, но не больше grid', buttonPosition: 'bottom left' },
  Accordion: { icon: 'стрелка', iconPosition: 'after', multiple: 'false', firstOpen: 'false' },
  List: { buttonPosition: 'bottom right', loop: 'false', gallery: 'false' },
  Records: { buttonText: 'Add card' },
  Slider: { loop: 'false' },
  SliderButton: { direction: 'next', label: 'по направлению' },
  SliderPagination: { label: 'Slider pages', pageLabel: 'Slide' },
};
function propRows(name) {
  const signatures = jsxProps[name] ?? [];
  const docs = settings[name] ?? [];
  const props = new Map();
  for (const [prop, type, optional] of signatures.flat()) {
    const prior = props.get(prop);
    props.set(prop, prior ? [[...new Set([...prior[0], type])], prior[1] || optional] : [[type], optional]);
  }
  const rows = [...props].sort(([a, [, ao]], [b, [, bo]]) => Number(ao) - Number(bo)
    || Number(a in commonPropNotes) - Number(b in commonPropNotes)).map(([prop, [types, optional]]) => {
    const match = docs.find(([label, type]) => type !== 'Gutenberg' && label.split(' / ').includes(prop));
    const fallback = match && (!match[0].includes(' / ') || match[2] === 'false') ? match[2] : '—';
    return [prop, types.join(' | '), splitDefaults[name]?.[prop] ?? fallback, match?.[3] ?? commonPropNotes[prop] ?? '—', !optional];
  });
  return rows;
}
export { entries, examples, children, related, nested, byName, propRows };
