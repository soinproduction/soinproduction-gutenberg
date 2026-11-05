# Icon

Метод: `addIcon`. Тип в схеме: `icon`.

## Объявление в schema.ts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addIcon('icon', {
    label: 'Icon',
    instructions: 'Choose an icon from the library.',
    defaultValue: '',
  })
  .build();
```

## Опции этого поля

| Опция | Тип | По умолчанию | Поведение |
| --- | --- | --- | --- |
| `label` | string | Производная от имени поля в редакторе; для toggle на фронте — имя поля. | Заголовок панели выбора. |
| `instructions` | string | Не задано | Подсказка в панели корневого поля; во вложенном контроле отдельно не выводится. |
| `defaultValue` | Зависит от типа | См. формат значения | Начальное значение указанного выше формата; не перезаписывает явно сохранённое значение. |

Другие ключи общего `FieldOptions`: `placeholder`, `choices`, `min`, `max`, `step`, `postType`, `tag`. Для этого поля они не подключены к контролу/выводу. Общий TypeScript-тип пока принимает их, но это не означает поддержку. Полная матрица — в [каталоге примеров](../README.md#опции).

## Значение

строковый ключ иконки; без иконки — `''`, например `'camera'`, `'star'`, `'arrow-right'`.

`defaultValue` в примере демонстрирует API. Его можно убрать; реальные данные вводятся в админке. Не вставляй ID, URL и контент чужого сайта как defaults.

## Вывод в component.tsx

```tsx
import { Field } from '@kit/core/fields/render';

<Field name="icon" className="text-3xl" />
```

Фрагмент используется внутри компонента модуля под `FieldScope`; его подключают SchemaEditor в editor.tsx и общий defineModule. Пропсы JSX не являются опциями schema.ts. Полный список props и отдельные функции рендера — [в каталоге](../README.md#рендер).

## Особенности и ограничения

Визуальный выбор получает все наборы из библиотеки админки Media → Icons через `site.icons`. В этом поле доступен вариант No icon, но отключена загрузка SVG/изображения из медиатеки. Размер можно менять обёрткой, а цвет сейчас задаёт общий Icon (по умолчанию flame). `color`, `size`, `strokeWidth`, `allowImage`, `library`, фильтры каталога не являются опциями schema API. Для своего цвета используй Icon с его prop `color` в кастомном компоненте.

[Все типы полей](../README.md) · [Библиотека и команды](../../README.md)
