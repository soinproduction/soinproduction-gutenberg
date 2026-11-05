(function($){
  const CFG = window.SPVideoPreview || {};
  const PLAYBACK = ['autoplay', 'muted', 'loop', 'controls', 'custom_play'];

  // A section sets CFG.scope while it has the media frame open: changes stay with that section.
  function sectionScope(){
    return CFG.scope || null;
  }

  function playbackInput($root, key){
    return $root.find('input[name$="[sp_video_' + key + ']"]').get(0);
  }

  function showPoster($root, posterUrl){
    $root.find('.sp-vp__url').val(posterUrl || '');
    setVideoPoster($root, posterUrl || '');
    $root.find('.sp-vp__poster').attr('src', posterUrl || '').toggle(!!posterUrl);
    $root.find('.sp-vp__poster-box').toggleClass('has-image', !!posterUrl);
    $root.find('.sp-vp__empty').toggle(!posterUrl);
    $root.find('.sp-vp__remove').toggleClass('is-hidden', !posterUrl);
  }

  function applyScope($root, root){
    const scope = sectionScope();
    $root.toggleClass('is-scoped', !!scope);
    $root.find('.sp-vp__scope-flag').val(scope ? '1' : '');
    if (!scope) {
      return;
    }
    const overrides = scope.overrides(Number($root.data('attachment-id'))) || {};
    const state = JSON.stringify(overrides);
    if (root.__spVpScopeState === state) {
      return;
    }
    root.__spVpScopeState = state;
    PLAYBACK.forEach(function(key){
      const input = playbackInput($root, key);
      if (input) {
        input.checked = overrides.inherit_playback === false ? !!overrides[key] : input.defaultChecked;
      }
    });
    showPoster($root, overrides.inherit_poster === false ? overrides.poster_url : String($root.attr('data-poster-url') || ''));
  }

  function bindScope($root, root){
    if (root.__spVpScopeBound) {
      return;
    }
    root.__spVpScopeBound = true;
    // Stops the media frame from auto-saving these switches to the attachment.
    root.addEventListener('change', function(event){
      const scope = sectionScope();
      if (!scope || event.target.getAttribute('role') !== 'switch') {
        return;
      }
      event.stopPropagation();
      const patch = { inherit_playback: false };
      PLAYBACK.forEach(function(key){
        const input = playbackInput($root, key);
        patch[key] = !!(input && input.checked);
      });
      scope.update(Number($root.data('attachment-id')), patch);
    });
  }

  function savePoster($root, attachmentId, posterId, posterUrl, attachment){
    const scope = sectionScope();
    if (scope) {
      scope.update(attachmentId, { inherit_poster: false, poster_id: posterId, poster_url: posterUrl });
      showPoster($root, posterUrl);
      return;
    }
    updatePosterUI($root, posterId, posterUrl, attachment);
  }
  const INIT_ATTR = 'data-sp-vp-init';

  function i18n(key, fallback){
  if (CFG.i18n && typeof CFG.i18n[key] === 'string' && CFG.i18n[key] !== '') {
    return CFG.i18n[key];
  }
  return fallback;
  }

  function secondsToClock(seconds){
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  function setStatus($root, text, type){
  const $status = $root.find('.sp-vp__status');
  if ($root.hasClass('is-busy')) {
    $root.find('.sp-vp__loader-text').text(text || i18n('processing', 'Processing...'));
  }
  $status.removeClass('is-ok is-error').text(text || '');
  if (type === 'ok') {
    $status.addClass('is-ok');
  }
  if (type === 'error') {
    $status.addClass('is-error');
  }
  }

  function setBusy($root, busy){
  $root.toggleClass('is-busy', !!busy).attr('aria-busy', busy ? 'true' : 'false');
  $root.find('button').prop('disabled', !!busy);
  }

  function updateTime($root, video){
  const duration = Number(video.duration);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const current = Number(video.currentTime) || 0;
  $root.find('.sp-vp__time').text(secondsToClock(current) + ' / ' + secondsToClock(safeDuration));
  }

  function syncTimeline($root, video){
  const $range = $root.find('.sp-vp__range');
  if (!video) {
    if ($range.length) {
    $range.prop('disabled', true).attr('max', '0').val('0');
    }
    $root.find('.sp-vp__time').text('00:00 / 00:00');
    return;
  }

  const duration = Number(video.duration);
  const hasDuration = Number.isFinite(duration) && duration > 0;

  if ($range.length) {
    $range.prop('disabled', !hasDuration);
    $range.attr('max', hasDuration ? String(duration) : '0');

    if (hasDuration && !$range.is(':active')) {
    const current = Math.min(Math.max(Number(video.currentTime) || 0, 0), duration);
    $range.val(String(current));
    }
  }

  updateTime($root, video);
  }

  function resolveVideoElement($root){
  if (!$root || !$root.length) {
    return null;
  }

  const primary = $root.find('video.sp-vp__video').get(0);
  if (primary) {
    return primary;
  }

  return $root.find('video').get(0) || null;
  }

  function bindVideoEvents($root, video){
  if (!video || typeof video.addEventListener !== 'function') {
    return;
  }

  const attachmentId = String($root.data('attachment-id') || '');
  const bindKey = '__spVpBound_' + attachmentId;
  if (video[bindKey] === true) {
    return;
  }
  video[bindKey] = true;

  const sync = function(){
    syncTimeline($root, resolveVideoElement($root) || video);
  };

  ['loadedmetadata', 'durationchange', 'loadeddata', 'canplay', 'timeupdate', 'seeked', 'play', 'pause'].forEach(function(eventName){
    video.addEventListener(eventName, sync);
  });
  }

  function setVideoPoster($root, posterUrl){
  const video = resolveVideoElement($root) || $root.find('.sp-vp__video').get(0);
  if (!video) {
    return;
  }

  if (posterUrl) {
    video.setAttribute('poster', posterUrl);
  } else {
    video.removeAttribute('poster');
  }
  }

  function updateMediaLibraryPreview($root, videoId, posterUrl, attachment){
  const attachmentId = Number(videoId) || 0;
  if (!attachmentId) {
    return;
  }

  const withBust = function(url){
    if (!url) {
    return '';
    }
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'spvp=' + Date.now();
  };

  const applyModelPreview = function(model, url){
    if (!model || !url) {
    return;
    }
    const image = { src: url, width: 512, height: 288 };
    // Backbone emits change with the model argument required by WP collections.
    model.set({ image: image, thumb: image });
  };

  const uiPosterUrl = posterUrl ? withBust(posterUrl) : '';

  let model = null;
            if (window.wp && wp.media && typeof wp.media.attachment === 'function') {
              model = wp.media.attachment(attachmentId);
            }
            if (model) {
              if (attachment && Number(attachment.id) === attachmentId) {
                // One authoritative update, including the refreshed compat form.
                // Avoid competing fetches that can restore an older preview.
                model.set(attachment);
              } else if (uiPosterUrl) {
                applyModelPreview(model, uiPosterUrl);
              }
            }

            // Only update the matching video, never every thumbnail in the modal.
            const $roots = $('.sp-vp').filter(function(){
              return Number($(this).data('attachment-id')) === attachmentId;
            });
            $roots.each(function(){
              setVideoPoster($(this), uiPosterUrl);
            });
            if ($root && $root.length) {
              setVideoPoster($root, uiPosterUrl);
            }

            const preview = attachment && (attachment.thumb || attachment.image);
            const tileUrl = uiPosterUrl || (preview && preview.src) || (model && model.get('icon')) || '';
            const $tile = $('.attachment[data-id="' + attachmentId + '"]');
            const $thumb = $tile.find('.thumbnail').first();
            if (!$thumb.length) {
              return;
            }
            if (!tileUrl) {
              $thumb.find('img').remove();
              return;
            }
            if (!$thumb.find('img').length) {
              $thumb.html('<div class="centered"><img alt="" draggable="false" /></div>');
            }
            $thumb.find('img').first().attr('src', tileUrl);
          }

  function updatePosterUI($root, posterId, posterUrl, attachment){
  const $img = $root.find('.sp-vp__poster');
  const $box = $root.find('.sp-vp__poster-box');
  const $empty = $root.find('.sp-vp__empty');
  const $remove = $root.find('.sp-vp__remove');

  $root.find('.sp-vp__poster-id').val(posterId ? String(posterId) : '');
  $root.find('.sp-vp__url').val(posterUrl || '');
  const rootNode = $root.get(0);

  if (rootNode) {
    rootNode.__spVpPosterUrl = String(posterUrl || '');
  }

  setVideoPoster($root, posterUrl || '');
  updateMediaLibraryPreview($root, $root.data('attachment-id'), posterUrl || '', attachment);

  if (posterUrl) {
    $img.attr('src', posterUrl).show();
    $box.addClass('has-image');
    $empty.hide();
    $remove.removeClass('is-hidden');
  } else {
    $img.attr('src', '').hide();
    $box.removeClass('has-image');
    $empty.show();
    $remove.addClass('is-hidden');
  }

  if (rootNode) {
    initOne(rootNode);
  }
  }

  function ensurePosterPreviewFromUrl($root){
  const url = String($root.find('.sp-vp__url').val() || '');
  const $img = $root.find('.sp-vp__poster');
  const $box = $root.find('.sp-vp__poster-box');
  const $empty = $root.find('.sp-vp__empty');
  const $remove = $root.find('.sp-vp__remove');

  if (url) {
    if (!$img.attr('src')) {
    $img.attr('src', url);
    }
    $img.show();
    $box.addClass('has-image');
    $empty.hide();
    $remove.removeClass('is-hidden');
  }
  }

  function sendAction(action, data){
  return $.ajax({
    url: CFG.ajaxUrl || window.ajaxurl,
    method: 'POST',
    dataType: 'json',
    data: Object.assign({
    action: action,
    nonce: CFG.nonce || ''
    }, data || {})
  });
  }

  function ensureVideoReady(video){
  return video
    && Number(video.videoWidth) > 0
    && Number(video.videoHeight) > 0
    && Number(video.readyState) >= 2;
  }

  function initOne(root){
  if (!root) {
    return;
  }

  const $root = $(root);
  const attachmentId = String($root.data('attachment-id') || '');
  if (!attachmentId) {
    return;
  }
    root.setAttribute(INIT_ATTR, attachmentId);

  const range = $root.find('.sp-vp__range').get(0);
  const sync = function(){
    const activeVideo = resolveVideoElement($root);
    bindVideoEvents($root, activeVideo);
    syncTimeline($root, activeVideo);
    ensurePosterPreviewFromUrl($root);
  };

  if (range) {
    const onScrub = function(){
    const video = resolveVideoElement($root);
    if (!video) {
      return;
    }

    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const nextTime = Number(range.value);
    if (!Number.isFinite(nextTime)) {
      return;
    }

    try {
      video.currentTime = Math.min(Math.max(nextTime, 0), duration);
      updateTime($root, video);
    } catch (e) {
      setStatus($root, i18n('error', 'Error'), 'error');
    }
    };

    range.oninput = onScrub;
    range.onchange = onScrub;
  }

  const posterUrl = String($root.find('.sp-vp__url').val() || '');
  if (posterUrl) {
    if (root.__spVpPosterUrl !== posterUrl) {
    root.__spVpPosterUrl = posterUrl;
    setVideoPoster($root, posterUrl);
    if (!sectionScope()) {
      updateMediaLibraryPreview($root, $root.data('attachment-id'), posterUrl);
    }
    }
  } else {
    root.__spVpPosterUrl = '';
  }

  bindScope($root, root);
  applyScope($root, root);
  sync();
}


  function scanAndInit(){
  $('.sp-vp').each(function(){
    initOne(this);
  });
  }

  let scanTimer = null;

  function scheduleScan(){
  if (scanTimer) {
    clearTimeout(scanTimer);
  }
  scanTimer = setTimeout(scanAndInit, 50);
  }

  $(scanAndInit);
  $(document).ajaxComplete(scheduleScan);

  if (window.MutationObserver && document.body) {
  const observer = new MutationObserver(function(){
    scheduleScan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  }

  $(document).on('click', '.sp-vp__capture', function(){
  const $btn = $(this);
  const $root = $btn.closest('.sp-vp');
  const video = resolveVideoElement($root);
  const attachmentId = Number($root.data('attachment-id')) || 0;

  if (!attachmentId || !video || !ensureVideoReady(video)) {
    setStatus($root, 'Video metadata is not ready yet. Press play once and try again.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    setStatus($root, i18n('error', 'Error'), 'error');
    return;
  }

  setBusy($root, true);
  setStatus($root, i18n('processing', 'Processing...'));

  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    setBusy($root, false);
    setStatus($root, 'Unable to draw frame from this video.', 'error');
    return;
  }

  canvas.toBlob(function(blob){
    if (!blob) {
    setBusy($root, false);
    setStatus($root, i18n('error', 'Error'), 'error');
    return;
    }

    const reader = new FileReader();

    reader.onload = function(){
    sendAction('sp_video_preview_save_frame', {
      attachment_id: attachmentId,
      image_data: String(reader.result || ''),
      section_only: sectionScope() ? 1 : 0
    }).done(function(resp){
      if (resp && resp.success && resp.data) {
      savePoster($root, attachmentId, resp.data.poster_id || 0, resp.data.poster_url || '', resp.data.attachment);
      setStatus($root, 'Poster saved.', 'ok');
      } else {
      setStatus($root, (resp && resp.data && resp.data.message) ? resp.data.message : i18n('error', 'Error'), 'error');
      }
    }).fail(function(){
      setStatus($root, i18n('error', 'Error'), 'error');
    }).always(function(){
      setBusy($root, false);
    });
    };

    reader.onerror = function(){
    setBusy($root, false);
    setStatus($root, i18n('error', 'Error'), 'error');
    };

    reader.readAsDataURL(blob);
  }, 'image/jpeg', 0.92);
  });

  $(document).on('click', '.sp-vp__choose', function(){
  const $btn = $(this);
  const $root = $btn.closest('.sp-vp');
  const attachmentId = Number($root.data('attachment-id')) || 0;

  if (!attachmentId || !window.wp || !wp.media) {
    setStatus($root, i18n('error', 'Error'), 'error');
    return;
  }

  const frame = wp.media({
    title: i18n('selectImage', 'Select poster image'),
    button: { text: i18n('useImage', 'Use this image') },
    library: { type: 'image' },
    multiple: false
  });

  frame.on('select', function(){
    const selected = frame.state().get('selection').first();
    if (!selected) {
    return;
    }

    const data = selected.toJSON();
    const posterId = Number(data.id) || 0;

    if (!posterId) {
    setStatus($root, i18n('error', 'Error'), 'error');
    return;
    }

    if (sectionScope()) {
      savePoster($root, attachmentId, posterId, String(data.url || ''));
      setStatus($root, 'Poster updated.', 'ok');
      return;
    }

    setBusy($root, true);
    setStatus($root, i18n('saving', 'Saving...'));

    sendAction('sp_video_preview_set_existing', {
    attachment_id: attachmentId,
    poster_id: posterId
    }).done(function(resp){
    if (resp && resp.success && resp.data) {
      updatePosterUI($root, resp.data.poster_id || 0, resp.data.poster_url || '', resp.data.attachment);
      setStatus($root, 'Poster updated.', 'ok');
    } else {
      setStatus($root, (resp && resp.data && resp.data.message) ? resp.data.message : i18n('error', 'Error'), 'error');
    }
    }).fail(function(){
    setStatus($root, i18n('error', 'Error'), 'error');
    }).always(function(){
    setBusy($root, false);
    });
  });

  frame.open();
  });

  $(document).on('click', '.sp-vp__reset', function(){
    const scope = sectionScope();
    const $root = $(this).closest('.sp-vp');
    if (!scope) {
      return;
    }
    scope.update(Number($root.data('attachment-id')), { inherit_poster: true, inherit_playback: true });
    applyScope($root, $root.get(0));
    setStatus($root, 'Using Media Library settings.', 'ok');
  });

  $(document).on('click', '.sp-vp__remove', function(){
  const $btn = $(this);
  const $root = $btn.closest('.sp-vp');
  const attachmentId = Number($root.data('attachment-id')) || 0;

  if (!attachmentId) {
    return;
  }

  if (sectionScope()) {
    savePoster($root, attachmentId, 0, '');
    setStatus($root, 'Poster removed.', 'ok');
    return;
  }

  setBusy($root, true);
  setStatus($root, i18n('removing', 'Removing...'));

  sendAction('sp_video_preview_remove', {
    attachment_id: attachmentId
  }).done(function(resp){
    if (resp && resp.success) {
    updatePosterUI($root, 0, '', resp.data && resp.data.attachment);
    setStatus($root, 'Poster removed.', 'ok');
    } else {
    setStatus($root, (resp && resp.data && resp.data.message) ? resp.data.message : i18n('error', 'Error'), 'error');
    }
  }).fail(function(){
    setStatus($root, i18n('error', 'Error'), 'error');
  }).always(function(){
    setBusy($root, false);
  });
  });
})(jQuery);
