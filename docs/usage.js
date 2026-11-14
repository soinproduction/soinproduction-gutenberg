const usage = {
  Choice: {
    title: 'Переключить раскладку карточек',
    description: 'В инспекторе редактор выбирает «Сетка» или «Список». В поле layout сохраняется ключ grid или list. Show показывает разметку для выбранного ключа.',
    code: `<Choice name="layout" label="Вид" choices={{
  grid: 'Сетка',
  list: 'Список',
}} />
<Show when="layout" is="grid">
  <ul className="grid grid-cols-2 gap-4">
    <li>Студия</li>
    <li>Оборудование</li>
  </ul>
</Show>
<Show when="layout" is="list">
  <ul className="space-y-4">
    <li>Студия</li>
    <li>Оборудование</li>
  </ul>
</Show>`,
  },
  Show: {
    title: 'Показать блок по условию',
    description: 'Choice сохраняет ключ, а Show сравнивает его с is. Полный пример раскладки находится в карточке Choice.',
    link: 'Choice',
  },
  Toggle: {
    title: 'Сделать примечание необязательным',
    description: 'Включите переключатель в инспекторе, чтобы показать текст. Поле note остаётся в схеме секции и при выключенном переключателе.',
    code: `<Toggle name="showNote" label="Показать примечание">
  <Text name="note" label="Примечание" />
</Toggle>`,
  },
  Records: {
    title: 'Собрать список FAQ',
    description: 'В боковой панели выберите записи FAQ и задайте порядок. manual позволяет добавить локальный вопрос прямо в эту секцию.',
    code: `<Records name="questions" type="faq" manual>
  <article className="border-b py-4">
    <RecordText field="question" as="span" />
    <RecordText field="answer" />
  </article>
</Records>`,
  },
  List: {
    title: 'Добавить карточки преимуществ',
    description: 'Редактор добавляет строки на холсте. Каждый элемент хранит свой title и description.',
    code: `<List name="features" label="Преимущества" max={4}>
  <article>
    <Heading name="title" level={3} />
    <Text name="description" />
  </article>
</List>`,
  },
  Buttons: {
    title: 'Задать основной и вторичный призыв',
    description: 'Первая кнопка получает accent, вторая — outline. Текст и действие для каждой кнопки задаются в Gutenberg.',
    code: `<Buttons
  name="actions"
  label="Действия"
  max={2}
  styles={['accent', 'outline']}
  className="flex flex-wrap gap-4"
/>`,
  },
  Drag: {
    title: 'Разложить заголовок и описание по колонкам',
    description: 'На широкой сетке заголовок занимает восемь колонок, описание — четыре.',
    code: `<Drag name="content" grid={12}>
  <Cols name="main" span={8}><Heading name="title" /></Cols>
  <Cols name="aside" span={4}><Text name="description" /></Cols>
</Drag>`,
  },
};
