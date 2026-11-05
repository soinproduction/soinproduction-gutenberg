# Select

Метод: `addSelect`. Тип в схеме: `select`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addSelect('layout', {
    label: 'Layout',
    instructions: 'Choose a section variation.',
    choices: {
      compact: 'Compact',
      spacious: 'Spacious',
    },
    defaultValue: '',
    tag: 'span',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Label нативного SelectControl. |
| `instructions` | string | Не задано | Метаданные; SelectControl сейчас не показывает эту подсказку. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `choices` | Record<string, string> | `{}` | Объект `{ value: label }`; порядок ключей задаёт порядок пунктов. |
| `tag` | string | Зависит от рендера | Тег фронтенда, по умолчанию `span`. |

Другие ключи общего `FieldOptions`: `placeholder`, `min`, `max`, `step`, `postType`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

string — ключ выбранной опции, например `'compact'`; без значения — `''`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="layout" as="span" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Первый пункт `Select…` со значением `''` добавляется автоматически. На фронте базовый Field выводит ключ (`compact`), а не подпись (`Compact`). Для варианта сетки прочитай `useField('layout').value`. Множественный выбор, AJAX и `allow_null` пока не реализованы.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
