# Group

Метод: `addGroup`. Тип в схеме: `group`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addGroup('badge', fields()
    .addRichText('value', { label: 'Value', tag: 'span' })
    .addText('caption', { label: 'Caption' }),
  {
    label: 'Experience badge',
    instructions: 'Experience value and caption.',
    defaultValue: { value: '', caption: '' },
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Метаданные группы; Group-компонент не создаёт отдельный заголовок. |
| `instructions` | string | Не задано | Метаданные; отдельная подсказка группы сейчас не выводится. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

объект дочерних значений; без defaultValue строится из пустых/начальных значений дочерних полей.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field, Group } from '@kit/core/fields/render';

<Group name="badge" className="space-y-2">
  <Field name="value" className="text-4xl" />
  <Field name="caption" />
</Group>
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Второй аргумент — дочерний FieldsBuilder, третий — опции. Group создаёт область имён: `value` и `caption` в примере берутся из `badge`. Сам Group не добавляет строки и не меняет порядок дочерних полей; их расположение задаёт JSX. `layout`, `min`, `max`, `tag` не подключены к этому контролу. При указании defaultValue передавай полный объект нужной формы; он не объединяется глубоко с дочерними defaults.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
