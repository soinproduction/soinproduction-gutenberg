# Relationship

Метод: `addRelationship`. Тип в схеме: `relationship`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addRelationship('posts', {
    label: 'Related posts',
    instructions: 'Select records and drag them into order.',
    postType: 'post',
  collection: 'posts',
  basePath: '/blog/',
    defaultValue: [],
    min: 0,
    max: 3,
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Заголовок панели, списков и поиска. |
| `instructions` | string | Не задано | Подсказка в панели InspectorControls; во вложенном контроле отдельно не выводится. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `min` | number | Не задано; для количества элементов — 0 | Минимальный размер выбора при удалении; по умолчанию 0. |
| `max` | number | Без ограничения | Максимальный размер выбора; по умолчанию без ограничения. |
| `postType` | PostType | `post` для relationship | `post` (по умолчанию), `page`, `service`, `tariff`, `review`, `faq`. Одно значение, не массив. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `step`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

массив числовых ID, например `[42, 17]`; без значения — `[]`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field, Relationship, RecordImage, RecordTitle, RecordExcerpt, RecordLink } from '@kit/core/fields/render';

<Relationship name="posts" className="grid gap-6 for-small-tablet:grid-cols-3">
  <article className="space-y-4">
    <RecordImage className="aspect-[4/3] w-full object-cover" />
    <RecordTitle as="h3" className="text-xl" />
    <RecordExcerpt />
    <RecordLink className="underline">Read more</RecordLink>
  </article>
</Relationship>
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Available/Selected: поиск, миниатюры, добавление, удаление, перетаскивание. Дубли исключаются всегда, отдельной опции unique нет. Выбранный порядок сохраняется. Названия, картинки и ссылки берутся из текущего site API, а не копируются в секцию. Не найденные/недоступные в этом API ID не выводятся. У `tariff`, `review`, `faq` публичных ссылок по умолчанию нет — RecordLink тогда ничего не выводит. Несколько postType, taxonomy-фильтры, AJAX/pagination, return_format, filters, elements и произвольные CPT пока не реализованы.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)

`postType` accepts any post type. `collection` defaults to postType + "s". `basePath` defaults to "/"; set it explicitly to the public route, or null for records without detail pages.
