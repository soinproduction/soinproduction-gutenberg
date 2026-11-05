# Number

Метод: `addNumber`. Тип в схеме: `number`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addNumber('quantity', {
    label: 'Quantity',
    instructions: 'Number of available spaces.',
    defaultValue: '',
    min: 0,
    max: 100,
    step: 1,
    tag: 'span',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Label числового TextControl. |
| `instructions` | string | Не задано | Метаданные; сейчас не отображаются у числового input. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |
| `min` | number | Не задано; для количества элементов — 0 | HTML-атрибут min; по умолчанию не задан. |
| `max` | number | Без ограничения | HTML-атрибут max; по умолчанию не задан. |
| `step` | number | Не задано | HTML-атрибут step; по умолчанию не задан. |
| `tag` | string | Зависит от рендера | Тег фронтенда, по умолчанию `span`; редактор остаётся числовым input. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `postType`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

number или пустая строка `''`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="quantity" as="span" className="text-4xl" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

`min`, `max`, `step` задают ограничения браузерного input, а не серверную валидацию. Пустой input сохраняет `''`, остальные введённые значения преобразуются через `Number()`. Формат валюты и единицы измерения задаются в компоненте.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
