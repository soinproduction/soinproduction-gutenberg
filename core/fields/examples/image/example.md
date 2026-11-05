# Image

Метод: `addImage`. Тип в схеме: `image`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addImage('photo', {
    label: 'Photo',
    instructions: 'Choose a studio photo.',
    defaultValue: { id: 0, url: '', alt: '' },
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Используется в подписи выбора изображения. |
| `instructions` | string | Не задано | Метаданные; MediaPicker сейчас не показывает отдельную подсказку. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

объект `{ id: number, url: string, alt: string }`. Пустое значение — `{ id: 0, url: '', alt: '' }`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="photo" className="aspect-[4/3] w-full object-cover" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Изображение выбирается через Media Library. Можно заменить, удалить и изменить alternative text. ID и URL запоминаются средствами медиатеки проекта. На фронте пустой URL ничего не выводит, `className` передаётся img; редактор использует собственную оболочку MediaPicker. Не поддерживаются schema-опции `return_format`, `preview_size`, `library`, `mime_types`, ограничения размера, `loading`, `width`, `height`.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
