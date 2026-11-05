# True / False

Метод: `addTrueFalse`. Тип в схеме: `toggle`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addTrueFalse('showBadge', {
    label: 'Show badge',
    instructions: 'Display the experience badge.',
    defaultValue: false,
    tag: 'span',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Label ToggleControl; запасной текст на фронте, если не переданы children. |
| `instructions` | string | Не задано | Метаданные; ToggleControl пока не показывает эту подсказку. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `tag` | string | Зависит от рендера | Тег вывода включённого значения; по умолчанию `span`. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

boolean; без значения — `false`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="showBadge" as="span" className="badge">Experience</Field>
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

В редакторе выводится ToggleControl. На фронте при `false` ничего нет, при `true` — children, label или имя поля. Для своего условия доступно `useField('showBadge').value`. `ui`, `message`, `ui_on_text`, `ui_off_text` пока не поддерживаются.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
