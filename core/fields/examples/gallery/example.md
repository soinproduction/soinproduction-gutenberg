# Gallery

Метод: `addGallery`. Тип в схеме: `gallery`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addGallery('photos', {
    label: 'Photos',
    instructions: 'Add and reorder gallery images.',
    defaultValue: [],
    min: 0,
    max: 12,
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Заголовок панели и списка изображений. |
| `instructions` | string | Не задано | Подсказка в панели InspectorControls; внутри вложенного списка отдельно не выводится. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `min` | number | Не задано; для количества элементов — 0 | Минимальное количество элементов при удалении; по умолчанию 0. |
| `max` | number | Без ограничения | Максимальное количество элементов при добавлении; по умолчанию без ограничения. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

массив `{ id, url, alt }`; без значения — `[]`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="photos" className="grid gap-4 for-small-tablet:grid-cols-3" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Добавление создаёт пустой элемент, затем изображение выбирается в Media Library. Есть замена, alt, удаление, перетаскивание. `className` управляет контейнером сетки; img получает базовые `w-full object-cover`. Lightbox, bulk-select, подписи caption, aspect ratio, размер превью и фильтры медиатеки пока не являются опциями этого поля.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
