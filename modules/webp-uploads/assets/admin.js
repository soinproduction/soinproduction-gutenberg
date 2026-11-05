(function ($) {
  const nonce = window.spWebpUploads.nonce;
  const STORAGE_KEY = 'sp_webp_bulk_progress_v1';
  const STORAGE_TTL = 1000 * 60 * 60 * 24;
  const state = {
    total: 0,
    lastId: 0,
    processed: 0,
    converted: 0,
    skipped: 0,
    errors: 0,
    bytesSaved: 0,
  };
  const convertNet = { retry: 0, maxRetry: 8, batchLimit: 20 };
  const replaceState = {
    totalRows: 0,
    processed: 0,
    changed: 0,
    hits: 0,
    errors: 0,
    mapCount: 0,
    cursor: { phase: 'posts', last_id: 0 },
  };
  const replaceNet = { retry: 0, maxRetry: 8 };
  const unusedState = {
    total: 0,
    lastId: 0,
    processed: 0,
    unused: 0,
    used: 0,
    errors: 0,
    customTables: 0,
    customColumns: 0,
    deleteQueue: [],
    deleteTotal: 0,
    deleted: 0,
    deleteSkipped: 0,
  };
  const unusedNet = {
    retry: 0,
    maxRetry: 6,
    batchLimit: 8,
    deleteRetry: 0,
    deleteMaxRetry: 4,
    deleteBatch: 12,
  };
  const runState = { running: false, mode: '' };
  let persistSuspended = false;
  const storage = (function () {
    try {
      if (!window.localStorage) return null;
      const probe = '__sp_webp_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  })();

  const $saved = $('#sp-webp-saved');
  const $status = $('#spc-status');
  const $log = $('#sp-webp-log');
  const $replaceStatus = $('#spr-status');
  const $replaceLog = $('#sp-webp-replace-log');
  const $unusedStatus = $('#spu-status');
  const $unusedLog = $('#sp-webp-unused-log');
  const $unusedBody = $('#sp-webp-unused-body');
  const $unusedSelectAll = $('#sp-webp-unused-select-all');

  function toInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  function cleanCursor(cursor) {
    const safe = cursor && typeof cursor === 'object' ? cursor : {};
    const phaseRaw = String(safe.phase || 'posts');
    const phase = ['posts', 'postmeta', 'done'].includes(phaseRaw) ? phaseRaw : 'posts';
    return {
      phase,
      last_id: Math.max(0, toInt(safe.last_id, 0)),
    };
  }

  function buildStoragePayload() {
    return {
      v: 1,
      ts: Date.now(),
      state: {
        total: Math.max(0, toInt(state.total, 0)),
        lastId: Math.max(0, toInt(state.lastId, 0)),
        processed: Math.max(0, toInt(state.processed, 0)),
        converted: Math.max(0, toInt(state.converted, 0)),
        skipped: Math.max(0, toInt(state.skipped, 0)),
        errors: Math.max(0, toInt(state.errors, 0)),
        bytesSaved: Math.max(0, toInt(state.bytesSaved, 0)),
      },
      convertNet: {
        batchLimit: Math.max(1, toInt(convertNet.batchLimit, 20)),
      },
      replaceState: {
        totalRows: Math.max(0, toInt(replaceState.totalRows, 0)),
        processed: Math.max(0, toInt(replaceState.processed, 0)),
        changed: Math.max(0, toInt(replaceState.changed, 0)),
        hits: Math.max(0, toInt(replaceState.hits, 0)),
        errors: Math.max(0, toInt(replaceState.errors, 0)),
        mapCount: Math.max(0, toInt(replaceState.mapCount, 0)),
        cursor: cleanCursor(replaceState.cursor),
      },
      runState: {
        running: !!runState.running,
        mode:
          runState.mode === 'replace' ? 'replace' : runState.mode === 'convert' ? 'convert' : '',
      },
    };
  }

  function persistProgress() {
    if (persistSuspended) return;
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(buildStoragePayload()));
    } catch (e) {
      // ignore quota/storage errors
    }
  }

  function clearPersistedProgress() {
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore storage errors
    }
  }

  function restoreProgress() {
    if (!storage) return null;
    let parsed = null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      parsed = JSON.parse(raw);
    } catch (e) {
      clearPersistedProgress();
      return null;
    }

    if (!parsed || typeof parsed !== 'object') {
      clearPersistedProgress();
      return null;
    }

    const ts = toInt(parsed.ts, 0);
    if (ts <= 0 || Date.now() - ts > STORAGE_TTL) {
      clearPersistedProgress();
      return null;
    }

    const savedState = parsed.state && typeof parsed.state === 'object' ? parsed.state : {};
    const savedReplaceState =
      parsed.replaceState && typeof parsed.replaceState === 'object' ? parsed.replaceState : {};
    const savedConvertNet =
      parsed.convertNet && typeof parsed.convertNet === 'object' ? parsed.convertNet : {};
    const savedRun = parsed.runState && typeof parsed.runState === 'object' ? parsed.runState : {};

    state.total = Math.max(0, toInt(savedState.total, state.total));
    state.lastId = Math.max(0, toInt(savedState.lastId, state.lastId));
    state.processed = Math.max(0, toInt(savedState.processed, state.processed));
    state.converted = Math.max(0, toInt(savedState.converted, state.converted));
    state.skipped = Math.max(0, toInt(savedState.skipped, state.skipped));
    state.errors = Math.max(0, toInt(savedState.errors, state.errors));
    state.bytesSaved = Math.max(0, toInt(savedState.bytesSaved, state.bytesSaved));

    replaceState.totalRows = Math.max(
      0,
      toInt(savedReplaceState.totalRows, replaceState.totalRows)
    );
    replaceState.processed = Math.max(
      0,
      toInt(savedReplaceState.processed, replaceState.processed)
    );
    replaceState.changed = Math.max(0, toInt(savedReplaceState.changed, replaceState.changed));
    replaceState.hits = Math.max(0, toInt(savedReplaceState.hits, replaceState.hits));
    replaceState.errors = Math.max(0, toInt(savedReplaceState.errors, replaceState.errors));
    replaceState.mapCount = Math.max(0, toInt(savedReplaceState.mapCount, replaceState.mapCount));
    replaceState.cursor = cleanCursor(savedReplaceState.cursor);

    convertNet.batchLimit = Math.max(
      1,
      toInt(savedConvertNet.batchLimit, Number($('#cfg-batch-size').val() || 20))
    );

    const savedMode =
      savedRun.mode === 'replace' ? 'replace' : savedRun.mode === 'convert' ? 'convert' : '';
    const shouldResume = !!savedRun.running && !!savedMode;

    return { shouldResume, mode: savedMode };
  }

  function fmtBytes(bytes) {
    let value = Number(bytes) || 0;
    if (value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return (i === 0 ? value.toFixed(0) : value.toFixed(2)) + ' ' + units[i];
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function appendUnusedLog(line) {
    if (!line) return;
    const ts = new Date().toLocaleTimeString();
    $unusedLog.append('[' + ts + '] ' + line + '\n');
    $unusedLog.scrollTop($unusedLog[0].scrollHeight);
  }

  function renderUnusedEmpty(message) {
    $unusedBody.html(
      '<tr class="sp-webp-unused-empty"><td colspan="6">' +
        escapeHtml(message || 'No unused images found yet.') +
        '</td></tr>'
    );
    $unusedSelectAll.prop('checked', false).prop('disabled', true);
  }

  function selectedUnusedIds() {
    return $unusedBody
      .find('.sp-webp-unused-select:checked')
      .map(function () {
        return Number($(this).closest('tr').data('attachmentId') || 0);
      })
      .get()
      .filter(Boolean);
  }

  function allFoundUnusedIds() {
    return $unusedBody
      .find('tr[data-attachment-id]')
      .filter(function () {
        const $row = $(this);
        const $button = $row.find('.sp-webp-unused-delete-one');
        return $button.length && !$button.prop('disabled');
      })
      .map(function () {
        return Number($(this).data('attachmentId') || 0);
      })
      .get()
      .filter(Boolean);
  }

  function refreshUnusedActionButtons() {
    const selectedCount = selectedUnusedIds().length;
    const foundCount = allFoundUnusedIds().length;
    const locked = runState.running;
    $('#sp-webp-unused-scan').prop('disabled', locked);
    $('#sp-webp-unused-clear').prop('disabled', locked);
    $('#sp-webp-unused-delete-selected').prop('disabled', locked || selectedCount === 0);
    $('#sp-webp-unused-delete-all').prop('disabled', locked || foundCount === 0);
    $unusedSelectAll.prop('disabled', foundCount === 0 || locked);
    $unusedSelectAll.prop('checked', foundCount > 0 && selectedCount === foundCount);
  }

  function updateUnusedStats() {
    $('#spu-processed').text(unusedState.processed);
    $('#spu-unused').text(unusedState.unused);
    $('#spu-used').text(unusedState.used);
    $('#spu-errors').text(unusedState.errors);
    $('#spu-custom-tables').text(unusedState.customTables);
    const percent =
      unusedState.total > 0
        ? Math.min(100, Math.round((unusedState.processed / unusedState.total) * 100))
        : 0;
    $('#spu-progress-bar').css('width', percent + '%');
    $('#spu-progress-text').text(percent + '%');
    refreshUnusedActionButtons();
  }

  function buildUnusedRow(item) {
    const title = escapeHtml(item.title || 'Attachment #' + item.id);
    const relative = escapeHtml(item.relative || '');
    const reason = escapeHtml(item.reason || 'No references found');
    const mime = escapeHtml(item.mime || '');
    const modified = escapeHtml(item.modified || '');
    const fileText = Number(item.file_exists || 0)
      ? fmtBytes(item.filesize || 0)
      : 'Missing on disk';
    const parentText =
      Number(item.parent_id || 0) > 0
        ? 'Attached to #' +
          escapeHtml(item.parent_id) +
          (item.parent_title ? ' (' + escapeHtml(item.parent_title) + ')' : '')
        : 'Unattached';
    const thumb = item.thumb_url
      ? '<img class="sp-webp-unused-preview" src="' + escapeHtml(item.thumb_url) + '" alt="">'
      : '<span class="sp-webp-unused-preview"></span>';
    const links = [
      item.url
        ? '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">Open file</a>'
        : '',
      item.edit_url ? '<a href="' + escapeHtml(item.edit_url) + '">Edit attachment</a>' : '',
    ]
      .filter(Boolean)
      .join(' · ');

    return [
      '<tr data-attachment-id="' + Number(item.id || 0) + '">',
      '<td class="sp-webp-unused-table__check"><input type="checkbox" class="sp-webp-unused-select"></td>',
      '<td>' + thumb + '</td>',
      '<td><div class="sp-webp-unused-title">' +
        title +
        '</div><div class="sp-webp-unused-meta">' +
        relative +
        '<br>' +
        escapeHtml(fileText) +
        ' · ' +
        mime +
        (modified ? ' · ' + modified : '') +
        '<br>' +
        escapeHtml(parentText) +
        (links ? '<br>' + links : '') +
        '</div></td>',
      '<td class="sp-webp-unused-reason">' + reason + '</td>',
      '<td><span class="sp-webp-unused-status">Unused</span></td>',
      '<td><button type="button" class="sp-webp-btn sp-webp-btn--danger sp-webp-unused-delete-one">Delete</button></td>',
      '</tr>',
    ].join('');
  }

  function appendUnusedRows(items) {
    if (!Array.isArray(items) || !items.length) {
      if (!allFoundUnusedIds().length) {
        renderUnusedEmpty('No unused images found yet.');
      }
      refreshUnusedActionButtons();
      return;
    }

    if ($unusedBody.find('.sp-webp-unused-empty').length) {
      $unusedBody.empty();
    }

    items.forEach(function (item) {
      $unusedBody.append(buildUnusedRow(item));
    });
    refreshUnusedActionButtons();
  }

  function markUnusedRowsDeleted(ids) {
    ids.forEach(function (id) {
      const $row = $unusedBody.find('tr[data-attachment-id="' + Number(id) + '"]');
      if (!$row.length) return;
      $row.addClass('sp-webp-unused-row--deleted');
      $row.find('.sp-webp-unused-select').remove();
      $row
        .find('.sp-webp-unused-status')
        .removeClass('sp-webp-unused-status--skipped')
        .addClass('sp-webp-unused-status--deleted')
        .text('Deleted');
      $row.find('.sp-webp-unused-delete-one').remove();
    });
    refreshUnusedActionButtons();
  }

  function markUnusedRowsSkipped(items) {
    (items || []).forEach(function (item) {
      const id = Number(item.id || 0);
      if (!id) return;
      const $row = $unusedBody.find('tr[data-attachment-id="' + id + '"]');
      if (!$row.length) return;
      $row.find('.sp-webp-unused-select').prop('checked', false).prop('disabled', true);
      $row
        .find('.sp-webp-unused-status')
        .removeClass('sp-webp-unused-status--deleted')
        .addClass('sp-webp-unused-status--skipped')
        .text('Skipped');
      $row.find('.sp-webp-unused-reason').text(item.reason || 'Skipped');
      $row.find('.sp-webp-unused-delete-one').prop('disabled', true);
    });
    refreshUnusedActionButtons();
  }

  function clearUnusedResults(options) {
    const keepLog = options && options.keepLog;
    unusedState.total = 0;
    unusedState.lastId = 0;
    unusedState.processed = 0;
    unusedState.unused = 0;
    unusedState.used = 0;
    unusedState.errors = 0;
    unusedState.customTables = 0;
    unusedState.customColumns = 0;
    unusedState.deleteQueue = [];
    unusedState.deleteTotal = 0;
    unusedState.deleted = 0;
    unusedState.deleteSkipped = 0;
    renderUnusedEmpty('No unused images found yet.');
    if (!keepLog) {
      $unusedLog.text('');
    }
    updateUnusedStats();
  }

  function appendLog(line) {
    if (!line) return;
    const ts = new Date().toLocaleTimeString();
    $log.append('[' + ts + '] ' + line + '\n');
    $log.scrollTop($log[0].scrollHeight);
  }

  function appendReplaceLog(line) {
    if (!line) return;
    const ts = new Date().toLocaleTimeString();
    $replaceLog.append('[' + ts + '] ' + line + '\n');
    $replaceLog.scrollTop($replaceLog[0].scrollHeight);
  }

  function updateStats() {
    $('#spc-total').text(state.total);
    $('#spc-converted').text(state.converted);
    $('#spc-skipped').text(state.skipped);
    $('#spc-errors').text(state.errors);
    $('#spc-saved-size').text(fmtBytes(state.bytesSaved));
    const percent =
      state.total > 0 ? Math.min(100, Math.round((state.processed / state.total) * 100)) : 0;
    $('#spc-progress-bar').css('width', percent + '%');
    $('#spc-progress-text').text(percent + '%');
    persistProgress();
  }

  function setSaved() {
    $saved.addClass('show');
    setTimeout(() => $saved.removeClass('show'), 1200);
  }

  function updateReplaceStats() {
    $('#spr-processed').text(replaceState.processed);
    $('#spr-changed').text(replaceState.changed);
    $('#spr-hits').text(replaceState.hits);
    $('#spr-map').text(replaceState.mapCount);

    const percent =
      replaceState.totalRows > 0
        ? Math.min(100, Math.round((replaceState.processed / replaceState.totalRows) * 100))
        : 0;
    $('#spr-progress-bar').css('width', percent + '%');
    $('#spr-progress-text').text(percent + '%');
    persistProgress();
  }

  function gatherCfg() {
    return {
      enabled_upload: $('#cfg-enabled-upload').is(':checked') ? 1 : 0,
      quality: Number($('#cfg-quality').val() || 90),
      max_side: Number($('#cfg-max-side').val() || 2560),
      delete_original: $('#cfg-delete-original').is(':checked') ? 1 : 0,
      skip_animated_gif: $('#cfg-skip-animated').is(':checked') ? 1 : 0,
      batch_size: Number($('#cfg-batch-size').val() || 20),
    };
  }

  function saveSettings() {
    $status.text('Saving settings...');
    $.post(
      ajaxurl,
      {
        action: 'sp_webp_save_settings',
        nonce,
        cfg: gatherCfg(),
      },
      function (res) {
        if (!res || !res.success) {
          $status.text('Settings save failed');
          appendLog('[ERR] Failed to save settings');
          return;
        }
        setSaved();
        $status.text('Settings saved');
        appendLog('[OK] Settings saved');
      }
    );
  }

  function scanMedia(callback) {
    $status.text('Scanning media library...');
    $.post(
      ajaxurl,
      {
        action: 'sp_webp_scan_media',
        nonce,
      },
      function (res) {
        if (!res || !res.success) {
          $status.text('Scan failed');
          appendLog('[ERR] Scan failed');
          if (typeof callback === 'function') callback(false);
          return;
        }

        state.total = Number(res.data.total_supported || 0);
        state.lastId = 0;
        state.processed = 0;
        state.converted = 0;
        state.skipped = 0;
        state.errors = 0;
        state.bytesSaved = 0;
        convertNet.retry = 0;
        convertNet.batchLimit = Math.max(
          1,
          Number(res.data.batch_size || $('#cfg-batch-size').val() || 20)
        );
        replaceState.totalRows = 0;
        replaceState.processed = 0;
        replaceState.changed = 0;
        replaceState.hits = 0;
        replaceState.errors = 0;
        replaceState.mapCount = 0;
        replaceState.cursor = { phase: 'posts', last_id: 0 };
        updateStats();
        updateReplaceStats();

        $status.text('Scan complete: ' + state.total + ' items in queue');
        appendLog('[OK] Scan complete. Queue: ' + state.total + ' images');

        if (typeof callback === 'function') callback(true);
      }
    );
  }

  function setRunning(running, mode) {
    runState.running = !!running;
    runState.mode = runState.running ? String(mode || '') : '';
    $('#sp-webp-start').prop('disabled', runState.running);
    $('#sp-webp-scan').prop('disabled', runState.running);
    $('#sp-webp-stop').prop('disabled', !runState.running);
    $('#sp-webp-reset-progress').prop('disabled', runState.running);
    $('#sp-webp-save').prop('disabled', runState.running);
    $('#sp-webp-replace-all').prop('disabled', runState.running);
    refreshUnusedActionButtons();
    persistProgress();
  }

  function resetSavedProgress() {
    if (runState.running) return;

    state.total = 0;
    state.lastId = 0;
    state.processed = 0;
    state.converted = 0;
    state.skipped = 0;
    state.errors = 0;
    state.bytesSaved = 0;

    replaceState.totalRows = 0;
    replaceState.processed = 0;
    replaceState.changed = 0;
    replaceState.hits = 0;
    replaceState.errors = 0;
    replaceState.mapCount = 0;
    replaceState.cursor = { phase: 'posts', last_id: 0 };

    convertNet.retry = 0;
    convertNet.batchLimit = Math.max(1, Number($('#cfg-batch-size').val() || 20));
    replaceNet.retry = 0;

    $log.text('');
    $replaceLog.text('');
    clearUnusedResults();
    persistSuspended = true;
    updateStats();
    updateReplaceStats();
    persistSuspended = false;
    clearPersistedProgress();
    $status.text('Saved progress reset');
    $replaceStatus.text('Saved progress reset');
    $unusedStatus.text('Saved progress reset');
    appendLog('[OK] Local saved progress cleared');
  }

  function handleConvertNetworkIssue(message) {
    if (!runState.running || runState.mode !== 'convert') return;
    if (convertNet.retry < convertNet.maxRetry) {
      convertNet.retry += 1;
      convertNet.batchLimit = Math.max(1, Math.floor(convertNet.batchLimit / 2));
      const waitMs = Math.min(8000, 800 * convertNet.retry);
      $status.text(
        'Retry ' + convertNet.retry + '/' + convertNet.maxRetry + ' after network error...'
      );
      appendLog(
        '[ERR] ' +
          message +
          '. Retry ' +
          convertNet.retry +
          '/' +
          convertNet.maxRetry +
          ' in ' +
          (waitMs / 1000).toFixed(1) +
          's. Batch=' +
          convertNet.batchLimit
      );
      setTimeout(runBatch, waitMs);
      return;
    }

    setRunning(false, '');
    $status.text(message);
    appendLog('[ERR] ' + message + '. Retries exhausted.');
  }

  function runBatch() {
    if (!runState.running || runState.mode !== 'convert') return;

    $.post(
      ajaxurl,
      {
        action: 'sp_webp_convert_batch',
        nonce,
        last_id: state.lastId,
        limit_override: convertNet.batchLimit,
      },
      function (res) {
        if (!runState.running || runState.mode !== 'convert') return;

        if (!res || !res.success) {
          handleConvertNetworkIssue('Batch request failed');
          return;
        }

        const d = res.data || {};
        convertNet.retry = 0;
        state.lastId = Number(d.last_id || state.lastId);
        state.processed += Number(d.batch_total || 0);
        state.converted += Number(d.converted || 0);
        state.skipped += Number(d.skipped || 0);
        state.errors += Number(d.errors || 0);
        state.bytesSaved += Number(d.bytes_saved || 0);

        (d.log || []).forEach(appendLog);
        updateStats();

        if (d.done) {
          setRunning(false, '');
          $status.text('Bulk conversion completed');
          appendLog(
            '[OK] Done. Converted: ' +
              state.converted +
              ', skipped: ' +
              state.skipped +
              ', errors: ' +
              state.errors +
              ', saved: ' +
              fmtBytes(state.bytesSaved)
          );
          appendLog('[>] Starting URL replacement...');
          startReplaceAll();
          return;
        }

        $status.text('Processing...');
        setTimeout(runBatch, 120);
      }
    ).fail(function () {
      handleConvertNetworkIssue('Network error during batch');
    });
  }

  function prepareReplace(callback) {
    $replaceStatus.text('Preparing URL map...');
    $.post(
      ajaxurl,
      {
        action: 'sp_webp_prepare_url_replace',
        nonce,
      },
      function (res) {
        if (!res || !res.success) {
          $replaceStatus.text('Prepare failed');
          appendReplaceLog('[ERR] Prepare mapping failed');
          if (typeof callback === 'function') callback(false);
          return;
        }

        const d = res.data || {};
        replaceState.totalRows = Number(d.total_rows || 0);
        replaceState.processed = 0;
        replaceState.changed = 0;
        replaceState.hits = 0;
        replaceState.errors = 0;
        replaceState.mapCount = Number(d.map_count || 0);
        replaceState.cursor = d.cursor || { phase: 'posts', last_id: 0 };
        replaceNet.retry = 0;
        updateReplaceStats();

        if (replaceState.mapCount <= 0) {
          $replaceStatus.text('No mappings found');
          appendReplaceLog('[-] No mapped old image URLs found.');
          if (typeof callback === 'function') callback(false);
          return;
        }

        $replaceStatus.text(
          'Ready: map ' + replaceState.mapCount + ', rows ' + replaceState.totalRows
        );
        appendReplaceLog(
          '[OK] Prepared mapping. URLs: ' +
            replaceState.mapCount +
            ', rows: ' +
            replaceState.totalRows
        );
        if (typeof callback === 'function') callback(true);
      }
    );
  }

  function handleReplaceNetworkIssue(message) {
    if (!runState.running || runState.mode !== 'replace') return;
    if (replaceNet.retry < replaceNet.maxRetry) {
      replaceNet.retry += 1;
      const waitMs = Math.min(8000, 800 * replaceNet.retry);
      $replaceStatus.text(
        'Retry ' + replaceNet.retry + '/' + replaceNet.maxRetry + ' after network error...'
      );
      appendReplaceLog(
        '[ERR] ' +
          message +
          '. Retry ' +
          replaceNet.retry +
          '/' +
          replaceNet.maxRetry +
          ' in ' +
          (waitMs / 1000).toFixed(1) +
          's'
      );
      setTimeout(runReplaceBatch, waitMs);
      return;
    }

    setRunning(false, '');
    $replaceStatus.text(message);
    appendReplaceLog('[ERR] ' + message + '. Retries exhausted.');
  }

  function runReplaceBatch() {
    if (!runState.running || runState.mode !== 'replace') return;

    $.post(
      ajaxurl,
      {
        action: 'sp_webp_replace_urls_batch',
        nonce,
        dry_run: 0,
        cursor: replaceState.cursor,
      },
      function (res) {
        if (!runState.running || runState.mode !== 'replace') return;

        if (!res || !res.success) {
          handleReplaceNetworkIssue('URL replace batch failed');
          return;
        }

        const d = res.data || {};
        replaceNet.retry = 0;
        replaceState.cursor = d.cursor || replaceState.cursor;
        replaceState.processed += Number(d.processed || 0);
        replaceState.changed += Number(d.changed || 0);
        replaceState.hits += Number(d.hits || 0);
        replaceState.errors += Number(d.errors || 0);
        replaceState.mapCount = Number(d.map_count || replaceState.mapCount);
        (d.log || []).forEach(appendReplaceLog);
        updateReplaceStats();

        if (d.done) {
          setRunning(false, '');
          $replaceStatus.text('Replacement completed');
          appendReplaceLog(
            '[OK] Done. Changed rows: ' + replaceState.changed + ', URL hits: ' + replaceState.hits
          );
          clearPersistedProgress();
          return;
        }

        $replaceStatus.text('Replacement in progress...');
        setTimeout(runReplaceBatch, 120);
      }
    ).fail(function () {
      handleReplaceNetworkIssue('Network error during URL replace');
    });
  }

  function startReplaceAll() {
    if (runState.running) return;
    prepareReplace(function (ok) {
      if (!ok) return;
      setRunning(true, 'replace');
      $replaceStatus.text('Starting URL replacement...');
      appendReplaceLog('[>] URL replacement started');
      runReplaceBatch();
    });
  }

  function prepareUnusedScan(callback) {
    $unusedStatus.text('Preparing unused-image scan...');
    $.post(
      ajaxurl,
      {
        action: 'sp_webp_prepare_unused_scan',
        nonce,
      },
      function (res) {
        if (!res || !res.success) {
          $unusedStatus.text('Prepare failed');
          appendUnusedLog('[ERR] Failed to prepare unused-image scan');
          if (typeof callback === 'function') callback(false);
          return;
        }

        const d = res.data || {};
        unusedState.total = Number(d.total_images || 0);
        unusedState.lastId = 0;
        unusedState.processed = 0;
        unusedState.unused = 0;
        unusedState.used = 0;
        unusedState.errors = 0;
        unusedState.customTables = Number(d.custom_tables || 0);
        unusedState.customColumns = Number(d.custom_columns || 0);
        unusedState.deleteQueue = [];
        unusedState.deleteTotal = 0;
        unusedState.deleted = 0;
        unusedState.deleteSkipped = 0;
        unusedNet.retry = 0;
        unusedNet.batchLimit = Math.max(1, Number(d.batch_size || unusedNet.batchLimit || 8));
        renderUnusedEmpty('Scanning in progress. Unused results will appear here.');
        updateUnusedStats();
        $unusedStatus.text(
          'Ready: ' + unusedState.total + ' images, ' + unusedState.customTables + ' custom tables'
        );
        appendUnusedLog(
          '[OK] Prepared scan. Images: ' +
            unusedState.total +
            ', custom tables: ' +
            unusedState.customTables +
            ', columns: ' +
            unusedState.customColumns
        );
        if (typeof callback === 'function') callback(true);
      }
    ).fail(function () {
      $unusedStatus.text('Prepare failed');
      appendUnusedLog('[ERR] Failed to prepare unused-image scan');
      if (typeof callback === 'function') callback(false);
    });
  }

  function handleUnusedScanNetworkIssue(message) {
    if (!runState.running || runState.mode !== 'unused-scan') return;
    if (unusedNet.retry < unusedNet.maxRetry) {
      unusedNet.retry += 1;
      const waitMs = Math.min(8000, 800 * unusedNet.retry);
      $unusedStatus.text(
        'Retry ' + unusedNet.retry + '/' + unusedNet.maxRetry + ' after network error...'
      );
      appendUnusedLog(
        '[ERR] ' +
          message +
          '. Retry ' +
          unusedNet.retry +
          '/' +
          unusedNet.maxRetry +
          ' in ' +
          (waitMs / 1000).toFixed(1) +
          's'
      );
      setTimeout(runUnusedScanBatch, waitMs);
      return;
    }

    setRunning(false, '');
    $unusedStatus.text(message);
    appendUnusedLog('[ERR] ' + message + '. Retries exhausted.');
  }

  function runUnusedScanBatch() {
    if (!runState.running || runState.mode !== 'unused-scan') return;

    $.post(
      ajaxurl,
      {
        action: 'sp_webp_scan_unused_batch',
        nonce,
        last_id: unusedState.lastId,
        limit: unusedNet.batchLimit,
      },
      function (res) {
        if (!runState.running || runState.mode !== 'unused-scan') return;

        if (!res || !res.success) {
          handleUnusedScanNetworkIssue('Unused-image scan batch failed');
          return;
        }

        const d = res.data || {};
        unusedNet.retry = 0;
        unusedState.lastId = Number(d.last_id || unusedState.lastId);
        unusedState.processed += Number(d.processed || 0);
        unusedState.unused += Number(d.unused || 0);
        unusedState.used += Number(d.used || 0);
        unusedState.errors += Number(d.errors || 0);
        appendUnusedRows(d.items || []);
        (d.log || []).forEach(appendUnusedLog);
        updateUnusedStats();

        if (d.done) {
          setRunning(false, '');
          if (unusedState.unused <= 0) {
            renderUnusedEmpty('Scan complete. No unused images were found.');
          }
          $unusedStatus.text('Unused-image scan completed');
          appendUnusedLog(
            '[OK] Done. Unused found: ' +
              unusedState.unused +
              ', kept: ' +
              unusedState.used +
              ', errors: ' +
              unusedState.errors
          );
          return;
        }

        $unusedStatus.text('Scanning database references...');
        setTimeout(runUnusedScanBatch, 90);
      }
    ).fail(function () {
      handleUnusedScanNetworkIssue('Network error during unused-image scan');
    });
  }

  function startUnusedScan() {
    if (runState.running) return;
    clearUnusedResults();
    prepareUnusedScan(function (ok) {
      if (!ok) return;
      if (unusedState.total <= 0) {
        $unusedStatus.text('No image attachments found');
        appendUnusedLog('[-] No image attachments found');
        return;
      }

      setRunning(true, 'unused-scan');
      $unusedStatus.text('Starting unused-image scan...');
      appendUnusedLog('[>] Unused-image scan started');
      runUnusedScanBatch();
    });
  }

  function handleUnusedDeleteNetworkIssue(message) {
    if (!runState.running || runState.mode !== 'unused-delete') return;
    if (unusedNet.deleteRetry < unusedNet.deleteMaxRetry) {
      unusedNet.deleteRetry += 1;
      const waitMs = Math.min(8000, 800 * unusedNet.deleteRetry);
      $unusedStatus.text(
        'Retry ' + unusedNet.deleteRetry + '/' + unusedNet.deleteMaxRetry + ' while deleting...'
      );
      appendUnusedLog(
        '[ERR] ' +
          message +
          '. Retry ' +
          unusedNet.deleteRetry +
          '/' +
          unusedNet.deleteMaxRetry +
          ' in ' +
          (waitMs / 1000).toFixed(1) +
          's'
      );
      setTimeout(runUnusedDeleteBatch, waitMs);
      return;
    }

    setRunning(false, '');
    $unusedStatus.text(message);
    appendUnusedLog('[ERR] ' + message + '. Retries exhausted.');
  }

  function runUnusedDeleteBatch() {
    if (!runState.running || runState.mode !== 'unused-delete') return;

    const chunk = unusedState.deleteQueue.slice(0, unusedNet.deleteBatch);
    if (!chunk.length) {
      setRunning(false, '');
      $unusedStatus.text('Delete completed');
      appendUnusedLog(
        '[OK] Delete done. Deleted: ' +
          unusedState.deleted +
          ', skipped: ' +
          unusedState.deleteSkipped +
          ', errors: ' +
          unusedState.errors
      );
      refreshUnusedActionButtons();
      return;
    }

    $.post(
      ajaxurl,
      {
        action: 'sp_webp_delete_unused_batch',
        nonce,
        ids: chunk,
      },
      function (res) {
        if (!runState.running || runState.mode !== 'unused-delete') return;

        if (!res || !res.success) {
          handleUnusedDeleteNetworkIssue('Delete batch failed');
          return;
        }

        const d = res.data || {};
        const deletedIds = Array.isArray(d.deleted_ids)
          ? d.deleted_ids.map(Number).filter(Boolean)
          : [];
        const skippedItems = Array.isArray(d.skipped) ? d.skipped : [];
        unusedNet.deleteRetry = 0;
        unusedState.deleteQueue = unusedState.deleteQueue.slice(chunk.length);
        unusedState.deleted += deletedIds.length;
        unusedState.deleteSkipped += skippedItems.length;
        unusedState.errors += Number(d.errors || 0);
        unusedState.unused = Math.max(
          0,
          unusedState.unused - deletedIds.length - skippedItems.length
        );
        unusedState.used += skippedItems.length;
        markUnusedRowsDeleted(deletedIds);
        markUnusedRowsSkipped(skippedItems);
        (d.log || []).forEach(appendUnusedLog);
        updateUnusedStats();

        if (!unusedState.deleteQueue.length) {
          setRunning(false, '');
          $unusedStatus.text('Delete completed');
          appendUnusedLog(
            '[OK] Delete done. Deleted: ' +
              unusedState.deleted +
              ', skipped: ' +
              unusedState.deleteSkipped +
              ', errors: ' +
              unusedState.errors
          );
          return;
        }

        const processed = unusedState.deleteTotal - unusedState.deleteQueue.length;
        $unusedStatus.text(
          'Deleting unused images... ' + processed + '/' + unusedState.deleteTotal
        );
        setTimeout(runUnusedDeleteBatch, 120);
      }
    ).fail(function () {
      handleUnusedDeleteNetworkIssue('Network error during delete');
    });
  }

  function startUnusedDelete(ids) {
    const queue = (ids || []).map(Number).filter(Boolean);
    if (runState.running || !queue.length) return;
    const label = queue.length === 1 ? 'this image' : queue.length + ' images';
    if (
      !window.confirm('Delete ' + label + '? The tool will re-check DB usage right before removal.')
    ) {
      return;
    }

    unusedState.deleteQueue = queue.slice();
    unusedState.deleteTotal = queue.length;
    unusedState.deleted = 0;
    unusedState.deleteSkipped = 0;
    unusedNet.deleteRetry = 0;
    setRunning(true, 'unused-delete');
    $unusedStatus.text('Deleting unused images...');
    appendUnusedLog('[>] Delete started for ' + queue.length + ' attachments');
    runUnusedDeleteBatch();
  }

  $('#sp-webp-save').on('click', saveSettings);

  $('#sp-webp-scan').on('click', function () {
    scanMedia();
  });

  $('#sp-webp-start').on('click', function () {
    if (runState.running) return;

    const start = function () {
      if (state.total <= 0) {
        $status.text('Queue is empty');
        appendLog('[-] Queue is empty');
        clearPersistedProgress();
        return;
      }
      setRunning(true, 'convert');
      $status.text('Starting bulk conversion...');
      appendLog('[>] Bulk conversion started');
      runBatch();
    };

    if (state.total <= 0) {
      scanMedia(function (ok) {
        if (ok) start();
      });
    } else {
      start();
    }
  });

  $('#sp-webp-stop').on('click', function () {
    if (!runState.running) return;
    const mode = runState.mode;
    setRunning(false, '');
    if (mode === 'replace') {
      $replaceStatus.text('Stopped by user');
      appendReplaceLog('[-] URL replace stopped by user');
    } else if (mode === 'unused-scan') {
      $unusedStatus.text('Stopped by user');
      appendUnusedLog('[-] Unused-image scan stopped by user');
    } else if (mode === 'unused-delete') {
      $unusedStatus.text('Delete stopped by user');
      appendUnusedLog('[-] Delete stopped by user');
    } else {
      $status.text('Stopped by user');
      appendLog('[-] Conversion stopped by user');
    }
  });

  $('#sp-webp-replace-all').on('click', function () {
    startReplaceAll();
  });

  $('#sp-webp-reset-progress').on('click', function () {
    resetSavedProgress();
  });

  $('#sp-webp-unused-scan').on('click', function () {
    startUnusedScan();
  });

  $('#sp-webp-unused-clear').on('click', function () {
    if (runState.running) return;
    clearUnusedResults();
    $unusedStatus.text('Results cleared');
    appendUnusedLog('[OK] Unused-image results cleared');
  });

  $('#sp-webp-unused-delete-selected').on('click', function () {
    startUnusedDelete(selectedUnusedIds());
  });

  $('#sp-webp-unused-delete-all').on('click', function () {
    startUnusedDelete(allFoundUnusedIds());
  });

  $unusedSelectAll.on('change', function () {
    const checked = $(this).is(':checked');
    $unusedBody.find('.sp-webp-unused-select').prop('checked', checked);
    refreshUnusedActionButtons();
  });

  $unusedBody.on('change', '.sp-webp-unused-select', function () {
    refreshUnusedActionButtons();
  });

  $unusedBody.on('click', '.sp-webp-unused-delete-one', function () {
    const id = Number($(this).closest('tr').data('attachmentId') || 0);
    if (!id) return;
    startUnusedDelete([id]);
  });

  const restored = restoreProgress();
  updateStats();
  updateReplaceStats();
  clearUnusedResults({ keepLog: true });

  if (restored) {
    appendLog('[i] Saved progress loaded. Click Start to continue.');
    $status.text('Saved progress is paused. Click Start to continue.');
  }
})(jQuery);
