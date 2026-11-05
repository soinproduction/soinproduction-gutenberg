# Textarea

Метод: `addTextarea`. Тип в схеме: `textarea`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addTextarea('note', {
    label: 'Note',
    instructions: 'Internal or public multiline note.',
    defaultValue: '',
    tag: 'div',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Label многострочного TextareaControl. |
| `instructions` | string | Не задано | Метаданные; сейчас не отображаются у TextareaControl. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `tag` | string | Зависит от рендера | Тег фронтенда; по умолчанию `span`. Не меняет тип контрола. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

string; без значения — `''`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="note" as="div" className="whitespace-pre-line" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Переносы строк сохраняются в строке. Для видимых переносов на фронте используй `whitespace-pre-line`. `rows`, `maxlength`, `new_lines` и `placeholder` в этот контрол не подключены.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
