# Text

Метод: `addText`. Тип в схеме: `text`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addText('title', {
    label: 'Title',
    instructions: 'Short plain-text title.',
    placeholder: 'Enter title…',
    defaultValue: '',
    tag: 'span',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Название/запасной placeholder; внутри повторителя — label TextControl. |
| `instructions` | string | Не задано | Сохраняется в описании поля, но этот контрол её пока не показывает. |
| `placeholder` | string | Label + … | Подсказка inline RichText. В TextControl повторителя пока не передаётся. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `tag` | string | Зависит от рендера | `span` по умолчанию; тег inline-редактирования и вывода, если нет `as`. |

Другие ключи общего `FieldOptions`: `choices`, `min`, `max`, `step`, `postType`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

string; без значения — `''`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="title" as="h3" className="text-xl" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Встроенная разметка отключена (`allowedFormats: []`). Это обычная строка, не HTML-редактор.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
