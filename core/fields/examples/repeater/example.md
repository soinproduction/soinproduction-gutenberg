# Repeater

Метод: `addRepeater`. Тип в схеме: `repeater`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addRepeater('items', fields()
    .addIcon('icon', { label: 'Icon' })
    .addRichText('title', { label: 'Title', tag: 'h3' })
    .addWysiwyg('description', { label: 'Description' }),
  {
    label: 'Items',
    instructions: 'Add and reorder items.',
    defaultValue: [],
    min: 0,
    max: 6,
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Заголовок панели и списка элементов. |
| `instructions` | string | Не задано | Подсказка в панели InspectorControls; у повторителя внутри вложенных контролов отдельно не выводится. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `min` | number | Не задано; для количества элементов — 0 | Минимальное число элементов при удалении; по умолчанию 0. |
| `max` | number | Без ограничения | Максимальное число элементов при добавлении; по умолчанию без ограничения. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

массив объектов с именами дочерних полей; без значения — `[]`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field, Repeater } from '@kit/core/fields/render';

<Repeater name="items" className="grid gap-6 for-small-tablet:grid-cols-3">
  <article className="space-y-4">
    <Field name="icon" />
    <Field name="title" as="h3" />
    <Field name="description" />
  </article>
</Repeater>
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Второй аргумент — дочерний FieldsBuilder, третий — опции повторителя. Имена дочерних полей уникальны внутри строки; они могут совпадать с именами других групп. Набор поддерживает вложенные группы/повторители. Новая строка получает пустые значения дочерних полей либо их defaultValue. Сетка фиксируется JSX, содержимое и порядок редактируются. `layout`, `button_label`, `collapsed`, `pagination`, `sortable`, `unique` пока не являются настройками повторителя; добавление/удаление/перетаскивание встроены.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
