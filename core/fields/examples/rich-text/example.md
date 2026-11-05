# RichText

Метод: `addRichText`. Тип в схеме: `richText`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addRichText('heading', {
    label: 'Heading',
    instructions: 'Section heading.',
    placeholder: 'Write a heading…',
    defaultValue: '',
    tag: 'h2',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Запасной текст placeholder, если он не указан явно. |
| `instructions` | string | Не задано | Метаданные; inline RichText не показывает отдельную подсказку. |
| `placeholder` | string | Label + … | Подсказка для пустого RichText. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `tag` | string | Зависит от рендера | `h1`–`h6`, `p`, `span`, `div`. Без tag редактор/прямой renderField используют `div`; генератор разметки ставит `as="h2"`. |

Другие ключи общего `FieldOptions`: `choices`, `min`, `max`, `step`, `postType`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

строка с разрешённой inline HTML-разметкой; без значения — `''`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="heading" as="h2" className="text-4xl" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Доступны bold, italic, link и собственный Accent. Настройки `allowedFormats`, `multiline`, `toolbar`, `media_upload` не вынесены в схему. На фронте форматирование рендерится безопасно; исполняемый HTML и небезопасные ссылки отбрасываются. `as` в JSX имеет приоритет над `tag`.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
