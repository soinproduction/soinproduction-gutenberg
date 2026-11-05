# Wysiwyg

Метод: `addWysiwyg`. Тип в схеме: `wysiwyg`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addWysiwyg('description', {
    label: 'Description',
    instructions: 'Add one or more paragraphs.',
    defaultValue: [],
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Название поля в схеме; ParagraphEditor пока использует свои фиксированные подписи. |
| `instructions` | string | Не задано | Метаданные; отдельная подсказка сейчас не выводится. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

массив строк с HTML каждого абзаца; без значения — `[]`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="description" className="space-y-4 leading-relaxed" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Пример значения: `['First <strong>paragraph</strong>', 'Second paragraph']`. Каждый элемент выводится отдельным `<p>`. Можно добавлять/удалять абзацы, разделять их Enter; Shift+Enter оставляет перенос внутри абзаца. Доступны bold, italic, strikethrough и Accent. Это контролируемый редактор абзацев. `toolbar`, `tabs`, `media_upload`, `allowedFormats`, `placeholder`, `min`, `max`, `tag` здесь не подключены; заголовки, списки и изображения объявляются отдельными полями.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
