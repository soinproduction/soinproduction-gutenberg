# Color Picker

Метод: `addColorPicker`. Тип в схеме: `color`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addColorPicker('accent', {
    label: 'Accent color',
    instructions: 'Color used by this section.',
    defaultValue: '',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Подпись legend над нативной ColorPalette. |
| `instructions` | string | Не задано | Метаданные; в текущем цветовом контроле не выводятся. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

строка цвета, например `'#ff7a32'`; без выбора — `''`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field, useField } from '@kit/core/fields/render';

function Component() {
  const { value: accent } = useField("accent");
  return <section style={{ color: accent || undefined }}>
    <Field name="accent" />
    <h2>Section title</h2>
  </section>;
}
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Field для цвета показывает контрол в Gutenberg и возвращает `null` на фронте. Используй значение цвета в своих style/props. Палитра `colors`, `disableCustomColors`, прозрачность и другие props ColorPalette не вынесены в schema API.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
