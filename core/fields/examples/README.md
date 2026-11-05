# Примеры всех типов полей

Для каждого из 17 поддерживаемых типов есть отдельный `example.md`: объявление со всеми применимыми опциями, формат значения, JSX и текущие ограничения. Примеры описывают наш React field kit, а не полный API ACF. Они не подключаются к сайту и не создают контент в базе.

| Метод | Папка | Пример |
| --- | --- | --- |
| `addText` | `text` | [Text](./text/example.md) |
| `addTextarea` | `textarea` | [Textarea](./textarea/example.md) |
| `addNumber` | `number` | [Number](./number/example.md) |
| `addTrueFalse` | `toggle` | [True / False](./toggle/example.md) |
| `addSelect` | `select` | [Select](./select/example.md) |
| `addColorPicker` | `color` | [Color Picker](./color/example.md) |
| `addRichText` | `rich-text` | [RichText](./rich-text/example.md) |
| `addWysiwyg` | `wysiwyg` | [Wysiwyg](./wysiwyg/example.md) |
| `addMedia` | `media` | [Universal media](./media/example.md) |
| `addImage` | `image` | [Image](./image/example.md) |
| `addGallery` | `gallery` | [Gallery](./gallery/example.md) |
| `addIcon` | `icon` | [Icon](./icon/example.md) |
| `addLink` | `link` | [Link / Action](./link/example.md) |
| `addButtons` | `buttons` | [Buttons](./buttons/example.md) |
| `addRepeater` | `repeater` | [Repeater](./repeater/example.md) |
| `addGroup` | `group` | [Group](./group/example.md) |
| `addRelationship` | `relationship` | [Relationship](./relationship/example.md) |

## Работа с примерами

Команды запускаются из `wp-content/themes/complex-studio/frontend`:

```sh
npm run create:section -- benefits
# Перенеси нужные объявления в src/blocks/sections/benefits/schema.ts
npm run render:module -- benefits
```

Объедини вызовы в одну цепочку `fields()…build()`. Генерация пишет JSX прямо в component.tsx. После ручного редактирования используй --stdout для просмотра новых полей; --force полностью заменяет разметку.

Имена полей: латинская буква в начале, далее буквы, цифры или `_`; имена уникальны внутри одной группы/строки. `constructor`, `prototype`, `__proto__` запрещены. Смена имени не переносит старое сохранённое значение.

## Опции

Это полный текущий `FieldOptions`. Тип общий для всех методов; часть ключей действует только у определённых полей. Неподключённые параметры специально не включены в рабочие объявления примеров.

| Опция | Тип | По умолчанию | Где работает |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Подпись контрола/панели там, где она предусмотрена. |
| `instructions` | string | Не задано | Показывается только через панели InspectorControls для relationship, repeater, gallery, buttons, link и корневого icon. В остальных контролах это пока только метаданные. |
| `placeholder` | string | Label + … | Подключён к inline text и richText; у остальных типов не используется. |
| `defaultValue` | Зависит от типа | Пустое значение данного типа | Используется, когда сохранённое значение отсутствует или null. Явные `false`, `0`, `''`, `[]` не заменяются. |
| `choices` | Record<string, string> | `{}` | Только select. |
| `min` | number | Не задано; для количества элементов — 0 | number: атрибут input; repeater/gallery/buttons/relationship: ограничение удаления. |
| `max` | number | Без ограничения | number: атрибут input; repeater/gallery/buttons/relationship: ограничение добавления. |
| `step` | number | Не задано | Только number, атрибут input. |
| `postType` | PostType | `post` для relationship | Только relationship. |
| `tag` | string | Зависит от рендера | Для inline text/richText и простого фронтенд-вывода number/textarea/select/toggle. `as` имеет приоритет. Не влияет на image/gallery/icon/link/buttons/wysiwyg/repeater/group/relationship. |

`name` — первый аргумент метода, не опция. `type` задаётся выбранным методом. `fields` создаётся из дочернего builder во втором аргументе addRepeater/addGroup, не передаётся как опция. `min`/`max` для списков измеряют количество элементов. Они не создают строки автоматически и не заменяют серверную проверку.

`required`, `conditional_logic`, `wrapper`, `disabled`, `readonly`, `return_format` и другие настройки ACF пока не поддерживаются. Для list-полей перетаскивание встроено; для relationship защита от дублей встроена и не отключается опцией.

Defaults — значения для отсутствующих/null полей, а не миграция данных. При редактировании данные хранятся в атрибуте `data` блока Gutenberg. Изменение defaultValue не переписывает явно сохранённые значения.

## Рендер

Компоненты импортируются из `@kit/core/fields/render`. Они работают внутри FieldScope; новые модули подключают его автоматически. Одна component.tsx используется для редактора и Next.

| Компонент | Все props | Что они означают |
| --- | --- | --- |
| `Field` | `name`, `as?`, `className?`, `children?` | name — имя поля; as — тег для text/richText и простых значений; className — класс корня рендера (для image — img); children используются фронтенд-рендером toggle. Не все редакторские контролы передают классы/тег на свою внутреннюю разметку. |
| `Repeater` | `name`, `className?`, `children?` | className — сетка; children повторяются внутри области полей каждой строки. as не используется. |
| `Group` | `name`, `className?`, `children?` | Контейнер и дочерняя область полей. as не используется. |
| `Relationship` | `name`, `className?`, `children?` | className — сетка; children повторяются внутри области каждой выбранной записи. as не используется. |
| `RecordImage` | `className?` | Изображение и alt текущей записи; без изображения ничего не выводит. |
| `RecordTitle` | `as?`, `className?` | Название записи, тег по умолчанию h3. |
| `RecordExcerpt` | `className?` | Описание/анонс записи. |
| `RecordLink` | `children`, `className?` | Ссылка текущей записи; без допустимого URL ничего не выводит. |
| `Action` | `value`, `site?`, `className?` | Самостоятельный рендер объекта действия (ссылка/модалка/иконка). Для модалки нужен site.modals. |

`FieldScope` принимает `schema`, `value`, `site`, `children` и необязательные `onChange`, `edit`. Последние два подключает адаптер Gutenberg. Вручную подключать их в обычном новом модуле не нужно.

Отдельные функции:

```tsx
import { renderField, renderFields, useField } from '@kit/core/fields/render';

// Frontend: поле по его определению и значению.
renderField(schema[0], data[schema[0].name], site, { className: 'text-xl' });

// Frontend: базовый вывод всего набора, включая группы/повторители/связи.
renderFields(schema, data, site);

// Внутри React-компонента под FieldScope: получить значение для своих условий/styles.
const { value, field, setValue } = useField('heading');
```

`renderField`/`renderFields` выводят сохранённые данные, не редакторские контролы. Редактирование обеспечивают Field/Repeater/Group/Relationship и адаптер Gutenberg. `useField` также возвращает текущую schema, site, onChange и edit из области; setValue действует только при подключённом onChange. В repeaters/groups имя ищется в текущей дочерней области, не в корне секции.

`as` должен быть безопасным React-тегом для текста. Для tag в схеме допустимы только h1–h6, p, span, div.

Источники истины: [schema.ts](../schema.ts), [editor.tsx](../editor.tsx), [render.tsx](../render.tsx), [records.ts](../records.ts).

## Дополнительные опции существующих секций

После перевода сайта на общий движок появились дополнительные параметры. Для новых простых полей они необязательны. Подробности и формат специальных связей — [Current site modules](../README.md#current-site-modules).

| Опция | Тип | Назначение |
| --- | --- | --- |
| `settings` | boolean | Показывать поле также в боковой панели выбранного блока. |
| `optional` | boolean | Не подставлять пустое значение, если поле ещё не сохранено. |
| `storage` | `'url'` | Хранить изображение строкой URL; без опции используется объект изображения. |
| `control` | string | Имя доменного контрола для addCustom; `svg` у URL-изображения ограничивает выбор SVG. |
| `recordField` | string | Связь с полем текущей записи: title/excerpt/slug. |
| `recordMeta` | string | Запись изменения в конкретный meta-ключ WordPress. |
| `resolveRecords` | boolean | Relationship с режимом all/selected/manual и объектом выбора вместо обычного массива ID. |
| `fromPosts` | boolean | Для resolveRecords всегда использовать все опубликованные записи источника. |
| `excludeCurrent` | boolean | Для resolveRecords исключать запись с текущим slug. |
| `itemType` | `'string'` | Строковые элементы явно сверстанного повторителя. |
| `services` | boolean | В custom-контроле menu разрешить пункт с выпадающим списком услуг. |

У JSX-компонента Field также доступны `inline`, `localized`, `imageProps`, `value` и `options`. Это параметры рендера/доменных контролов, а не schema-опции. `name` может быть массивом пути. В обычном сгенерированном модуле достаточно строкового имени; примеры выше остаются рабочими.

- [Content area / addContentArea](content/example.md): ordered native blocks within a section, allowed types and initial template.
- Reusable field sets: `fields().addFields(preset)`; section preset: `sectionSettings` from `core/fields/presets`.
- `scaffold:false` excludes a field from generated JSX while keeping its data and editor control.
