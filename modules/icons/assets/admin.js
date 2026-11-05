(() => {
  const config = window.spIconsAdmin,
    $ = (id) => document.getElementById(id);
  let sets = config.sets,
    busy = false,
    active = 'all',
    selected = null,
    limit = 80;
  const dialog = $('sp-icons-import-dialog');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const symbol = (name) => el('span', 'dashicons dashicons-' + name);
  const button = (label, icon, click, className = 'sp-icon-button') => {
    const node = el('button', className);
    node.type = 'button';
    if (icon) node.append(symbol(icon));
    node.append(document.createTextNode(label));
    node.onclick = click;
    return node;
  };
  const entries = () =>
    Object.entries(sets).flatMap(([slug, set]) =>
      Object.entries(set.icons).map(([key, icon]) => ({
        ...icon,
        key,
        slug,
        set: set.name,
        value: icon.value || `custom:${slug}:${key}`,
      }))
    );
  const image = (icon) => {
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml,' + encodeURIComponent(icon.svg);
    img.alt = '';
    return img;
  };
  function status(text, error = false) {
    $('sp-icons-status').textContent = text;
    $('sp-icons-status').classList.toggle('is-error', error);
    $('sp-icons-dialog-status').textContent = dialog.open ? text : '';
  }
  function source(mode) {
    $('sp-icons-zip-fields').hidden = mode !== 'zip';
    $('sp-icons-media-fields').hidden = mode !== 'media';
    $('sp-icons-source-zip').setAttribute('aria-pressed', mode === 'zip');
    $('sp-icons-source-media').setAttribute('aria-pressed', mode === 'media');
  }
  function openImport(mode = 'zip', slug = '') {
    source(mode);
    $('sp-icons-name').value = sets[slug]?.name || '';
    $('sp-icons-dialog-status').textContent = '';
    dialog.showModal();
  }
  async function save(mode, extras = {}) {
    if (busy) return;
    const name = $('sp-icons-name').value.trim();
    if (!mode.startsWith('remove') && !name) {
      $('sp-icons-name').focus();
      status('Enter a collection name.', true);
      return;
    }
    const body = new FormData();
    body.set('action', 'sp_icons_save');
    body.set('nonce', config.nonce);
    body.set('mode', mode);
    body.set('name', name);
    Object.entries(extras).forEach(([key, value]) => body.set(key, value));
    busy = true;
    document.querySelectorAll('.sp-icons-admin button').forEach((b) => (b.disabled = true));
    status('Saving your library…');
    try {
      const response = await fetch(config.ajax, {
          method: 'POST',
          body,
          credentials: 'same-origin',
        }),
        result = await response.json();
      if (!result.success) throw new Error(result.data?.message || 'Could not save the library.');
      sets = result.data.sets;
      if (active !== 'all' && !sets[active]) active = 'all';
      selected = null;
      limit = 80;
      render();
      dialog.close();
      status(
        mode.startsWith('remove')
          ? 'Removed from the library. Original media files are unchanged.'
          : 'Collection saved. Ready to use in the editor.'
      );
      $('sp-icons-archive').value = '';
      $('sp-icons-filename').textContent = 'Drop your ZIP here or browse files';
    } catch (error) {
      status(error.message, true);
    } finally {
      busy = false;
      document.querySelectorAll('.sp-icons-admin button').forEach((b) => (b.disabled = false));
    }
  }
  function render() {
    const all = entries(),
      nav = $('sp-icons-nav');
    nav.replaceChildren();
    const navItem = (slug, name, count) => {
      const node = button(
        name,
        slug === 'all' ? 'screenoptions' : 'category',
        () => {
          active = slug;
          limit = 80;
          render();
        },
        'sp-icons-nav-item'
      );
      node.classList.toggle('is-active', active === slug);
      node.setAttribute('aria-current', active === slug ? 'true' : 'false');
      node.append(el('span', 'sp-icons-nav-count', String(count)));
      nav.append(node);
    };
    navItem('all', 'All icons', all.length);
    Object.entries(sets).forEach(([slug, set]) =>
      navItem(slug, set.name, Object.keys(set.icons).length)
    );
    const query = $('sp-icons-search').value.trim().toLowerCase(),
      list = all.filter(
        (icon) =>
          (active === 'all' || icon.slug === active) &&
          `${icon.label} ${icon.key} ${icon.set}`.toLowerCase().includes(query)
      );
    $('sp-icons-active-name').textContent = active === 'all' ? 'All icons' : sets[active].name;
    $('sp-icons-count').textContent = `${list.length} ${list.length === 1 ? 'icon' : 'icons'}${
      active === 'all' ? ` across ${Object.keys(sets).length} collections` : ''
    }`;
    const root = $('sp-icons-sets');
    root.replaceChildren();
    if (active !== 'all') {
      const actions = el('div', 'sp-icons-collection-actions');
      actions.append(
        el('span', '', 'Manage this collection'),
        button('Update', 'update', () => openImport('zip', active), 'sp-icon-button is-small'),
        button(
          'Remove',
          'trash',
          () => {
            if (
              confirm(
                `Remove “${sets[active].name}” from the library? Reimport the same collection to restore its icon selections.`
              )
            )
              save('remove', { slug: active });
          },
          'sp-icon-button is-small is-danger'
        )
      );
      root.append(actions);
    }
    const grid = el('div', 'sp-icons-grid');
    list.slice(0, limit).forEach((icon) => {
      const tile = el('button', 'sp-icons-tile');
      tile.type = 'button';
      tile.title = icon.label;
      tile.setAttribute('aria-label', `${icon.label} — ${icon.set}`);
      tile.setAttribute('aria-pressed', selected?.value === icon.value ? 'true' : 'false');
      tile.append(image(icon), el('span', '', icon.label));
      tile.onclick = () => {
        selected = icon;
        render();
      };
      grid.append(tile);
    });
    root.append(grid);
    if (!list.length) {
      const empty = el('div', 'sp-icons-empty');
      empty.append(
        symbol('search'),
        el('h3', '', all.length ? 'No icons found' : 'Your next icon starts here'),
        el(
          'p',
          '',
          all.length
            ? 'Try a different search or collection.'
            : 'Import a collection or add SVGs to get started.'
        )
      );
      root.append(empty);
    }
    const pagination = $('sp-icons-pagination');
    pagination.replaceChildren();
    if (limit < list.length)
      pagination.append(
        button(`Show more (${list.length - limit} remaining)`, 'plus-alt2', () => {
          limit += 80;
          render();
        })
      );
    preview();
  }
  function preview() {
    const root = $('sp-icons-preview');
    root.replaceChildren();
    if (!selected) {
      const empty = el('div', 'sp-icons-preview-empty');
      empty.append(
        symbol('visibility'),
        el('h3', '', 'Select an icon'),
        el('p', '', 'See it up close and manage its details.')
      );
      root.append(empty);
      return;
    }
    const stage = el('div', 'sp-icons-preview-stage');
    stage.append(image(selected));
    root.append(stage, el('h3', '', selected.label), el('p', 'sp-icons-preview-set', selected.set));
    const id = el('code', 'sp-icons-id', selected.value);
    root.append(id);
    root.append(
      button(
        'Copy icon ID',
        'admin-page',
        async () => {
          try {
            await navigator.clipboard.writeText(selected.value);
            status('Icon ID copied.');
          } catch {
            status('Select and copy the icon ID shown above.');
          }
        },
        'sp-icon-button sp-icons-copy'
      )
    );
    const controls = el('div', 'sp-icons-preview-options'),
      color = document.createElement('input');
    color.type = 'color';
    color.value = '#1e293b';
    color.setAttribute('aria-label', 'Preview icon color');
    const mask = el('span', 'sp-icons-color-preview');
    mask.style.maskImage = `url("data:image/svg+xml,${encodeURIComponent(selected.svg)}")`;
    mask.style.webkitMaskImage = mask.style.maskImage;
    color.oninput = () => (mask.style.color = color.value);
    controls.append(el('span', '', 'Color preview'), color, mask);
    root.append(controls);
    root.append(
      button(
        'Remove icon',
        'trash',
        () => {
          if (
            confirm(
              `Remove “${selected.label}” from this collection? Original media files will be kept.`
            )
          )
            save('remove_icon', { slug: selected.slug, key: selected.key });
        },
        'sp-icon-button is-danger sp-icons-remove-icon'
      )
    );
  }
  $('sp-icons-search').oninput = () => {
    limit = 80;
    render();
  };
  $('sp-icons-open-import').onclick = () => openImport();
  $('sp-icons-add-svg').onclick = () => openImport('media');
  $('sp-icons-source-zip').onclick = () => source('zip');
  $('sp-icons-source-media').onclick = () => source('media');
  $('sp-icons-archive').onchange = () => {
    $('sp-icons-filename').textContent =
      $('sp-icons-archive').files[0]?.name || 'Drop your ZIP here or browse files';
  };
  const zone = $('sp-icons-dropzone');
  zone.ondragover = (e) => {
    e.preventDefault();
    zone.classList.add('is-dragging');
  };
  zone.ondragleave = () => zone.classList.remove('is-dragging');
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove('is-dragging');
    if (e.dataTransfer.files.length) {
      $('sp-icons-archive').files = e.dataTransfer.files;
      $('sp-icons-archive').onchange();
    }
  };
  $('sp-icons-import').onclick = () => {
    const archive = $('sp-icons-archive').files[0];
    if (!archive) {
      status('Choose an IcoMoon ZIP first.', true);
      return;
    }
    save('zip', { archive });
  };
  $('sp-icons-media').onclick = () => {
    if (!$('sp-icons-name').value.trim()) {
      status('Enter a collection name.', true);
      $('sp-icons-name').focus();
      return;
    }
    dialog.close();
    const frame = wp.media({
      title: 'Choose SVG icons',
      button: { text: 'Add to icon set' },
      library: { type: 'image/svg+xml' },
      multiple: true,
    });
    frame.on('select', () =>
      save('media', {
        ids: JSON.stringify(
          frame
            .state()
            .get('selection')
            .toJSON()
            .map((item) => item.id)
        ),
      })
    );
    frame.open();
  };
  render();
})();
