// Interactive illustrations of the JSX scenarios; no WordPress data is changed.
const playgrounds = {
  Records({ select, check, button, preview }) {
    const library = ['Как забронировать студию?', 'Можно ли перенести бронь?', 'Что входит в аренду?'];
    let picked = [0, 1];
    let local = false;
    const source = select('Источник', [['picked', 'Выбранные записи'], ['latest', 'Последние записи']]);
    const max = select('Лимит выбора · max', [['2', '2'], ['3', '3']]);
    const manual = check('Разрешить локальную карточку · manual');
    const additions = library.map((question, i) => check(question, picked.includes(i), input => {
      picked = input.checked ? [...picked, i] : picked.filter(id => id !== i);
    }));
    const reverse = button('Обратить порядок', () => picked.reverse());
    const add = button('Добавить локальный вопрос', () => { local = !local; });
    return () => {
      const auto = source.value === 'latest';
      const limit = Number(max.value);
      const ids = auto ? [2, 1] : picked.slice(0, limit);
      additions.forEach((input, i) => {
        input.disabled = auto || (!picked.includes(i) && picked.length >= limit);
        input.checked = picked.includes(i);
      });
      reverse.disabled = auto || picked.length < 2;
      add.disabled = auto || !manual.checked || (!local && picked.length >= limit);
      add.textContent = local ? 'Убрать локальный вопрос' : 'Добавить локальный вопрос';
      const list = element('ol', '');
      list.className = 'demo-records';
      for (const id of ids) list.append(element('li', library[id]));
      if (!auto && manual.checked && local && picked.length < limit) list.append(element('li', 'Локальный вопрос · только в этой секции'));
      preview.replaceChildren(list.childElementCount ? list : element('p', 'Записи не выбраны.'));
      return auto
        ? 'latest={2} → показаны две последние записи'
        : 'max={' + limit + '}' + (manual.checked ? ' manual' : '') + ' → показано ' + list.childElementCount;
    };
  },
  Buttons({ select, check, button, preview }) {
    const options = [['accent', 'Акцент'], ['outline', 'Контур'], ['text', 'Текст']];
    const first = select('Стиль первой кнопки', options);
    const second = select('Стиль второй кнопки', options, 'outline');
    const max = select('Лимит · max', [['2', '2'], ['1', '1']]);
    let count = 1;
    const add = button('Добавить кнопку', () => { count += 1; });
    const remove = button('Убрать последнюю', () => { count -= 1; });
    const icon = check('Показывать иконку');
    const position = select('Положение иконки', [['after', 'После текста'], ['before', 'Перед текстом']]);
    return () => {
      position.disabled = !icon.checked;
      add.disabled = count >= Number(max.value);
      remove.disabled = count === 0;
      const styles = [first.value, second.value];
      preview.replaceChildren(...styles.slice(0, count).map((style, i) => {
        const text = ['Забронировать', 'Узнать больше'][i];
        const sample = element('span', !icon.checked ? text : position.value === 'before' ? '↗ ' + text : text + ' ↗');
        sample.className = 'demo-button';
        sample.dataset.style = style;
        return sample;
      }));
      if (!count) preview.append(element('p', 'Кнопки ещё не добавлены.'));
      return 'max={' + max.value + '} styles={[' + styles.map(s => JSON.stringify(s)).join(', ') + ']}';
    };
  },
  Drag({ select, preview }) {
    const view = select('Ширина примера', [['wide', 'Широкая'], ['narrow', 'Узкая']]);
    const grid = select('Колонки · grid', [['12', '12'], ['8', '8'], ['6', '6']]);
    const mobile = select('Узкие колонки · mobileGrid', [['6', '6'], ['4', '4'], ['2', '2']]);
    const span = select('Ширина заголовка · span', [['8', '8'], ['6', '6'], ['4', '4'], ['2', '2']]);
    const gap = select('Отступ · gap', [['1', '1 rem'], ['0', '0'], ['2', '2 rem']]);
    return () => {
      const count = Number(view.value === 'wide' ? grid.value : mobile.value);
      const row = element('div', '');
      row.className = 'demo-grid';
      row.dataset.view = view.value;
      row.style.gridTemplateColumns = 'repeat(' + count + ', minmax(0, 1fr))';
      row.style.gap = gap.value + 'rem';
      for (const [text, width] of [['Заголовок', Number(span.value)], ['Описание', 4]]) {
        const col = element('div', text);
        col.style.gridColumn = 'span ' + Math.min(count, width);
        row.append(col);
      }
      preview.replaceChildren(row);
      return 'grid={' + grid.value + '} mobileGrid={' + mobile.value + '} gap={' + gap.value + '} · span={' + span.value + '}';
    };
  },
};

function createPlayground(name) {
  if (!playgrounds[name]) return null;
  const root = element('section', '');
  root.className = 'preview playground';
  const controls = element('div', '');
  controls.className = 'demo-controls';
  const preview = element('div', '');
  preview.className = 'demo-result';
  const state = element('code', '');
  state.setAttribute('aria-live', 'polite');
  function field(label, input) {
    const wrapper = element('label', label);
    wrapper.append(input);
    controls.append(wrapper);
    return input;
  }
  const render = playgrounds[name]({
    preview,
    select(label, values, initial) {
      const input = element('select', '');
      for (const [value, caption] of values) input.add(new Option(caption, value));
      if (initial) input.value = initial;
      input.addEventListener('change', update);
      return field(label, input);
    },
    check(label, initial, change) {
      const input = element('input', '');
      input.type = 'checkbox';
      input.checked = Boolean(initial);
      input.addEventListener('change', () => { change?.(input); update(); });
      input.className = 'demo-checkbox';
      return field(label, input);
    },
    button(label, change) {
      const input = element('button', label);
      input.type = 'button';
      input.addEventListener('click', () => { change(); update(); });
      controls.append(input);
      return input;
    },
  });
  function update() { state.textContent = render(); }
  root.append(element('h3', 'Попробовать'), element('p', 'Демо на тестовых данных. В WordPress настройки и внешний вид зависят от темы.'), controls, preview, state);
  update();
  return root;
}
