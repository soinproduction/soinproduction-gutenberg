(function ($) {
  function setBusy($button, busy) {
    const original = $button.data('spOriginalText') || $button.text();
    if (!$button.data('spOriginalText')) {
      $button.data('spOriginalText', original);
    }
    $button.toggleClass('is-busy', busy).prop('disabled', busy);
    $button.text(busy ? 'Replacing...' : original);
  }

  function showMessage(message) {
    window.alert(message);
  }

  function responseMessage(response, fallback) {
    if (!response) {
      return fallback;
    }

    if (typeof response.data === 'string' && response.data.trim()) {
      return response.data.trim();
    }

    if (
      response.data &&
      typeof response.data.message === 'string' &&
      response.data.message.trim()
    ) {
      return response.data.message.trim();
    }

    return fallback;
  }

  function requestErrorMessage(xhr) {
    const status = Number(xhr && xhr.status ? xhr.status : 0);
    const response = xhr && xhr.responseJSON ? xhr.responseJSON : null;
    let message = responseMessage(response, '');

    if (!message && xhr && typeof xhr.responseText === 'string') {
      const text = xhr.responseText.trim();
      if (text && text !== '0' && text !== '-1' && text.charAt(0) === '{') {
        try {
          message = responseMessage(JSON.parse(text), '');
        } catch (error) {
          // The response was not valid WordPress JSON; use the status fallback below.
        }
      }

      if (!message && text === '-1') {
        message = 'The security check expired. Reload the Media Library page and try again.';
      }
    }

    if (message) {
      return message;
    }

    if (status === 413) {
      return 'The replacement file is larger than the server upload limit.';
    }

    if (status === 400) {
      return 'The server rejected the replacement request. Check the image format and file size, reload the page, and try again.';
    }

    if (status === 403) {
      return 'The replacement was rejected by the security check. Reload the page and try again.';
    }

    return status
      ? 'Replace failed (HTTP ' + status + ').'
      : 'Replace failed. Check your connection and try again.';
  }

  function normalizedMime(mime) {
    mime = String(mime || '').toLowerCase();
    return mime === 'image/jpg' ? 'image/jpeg' : mime;
  }

  function acceptForMime(mime) {
    const types = {
      'image/gif': '.gif,image/gif',
      'image/jpeg': '.jpg,.jpeg,image/jpeg',
      'image/png': '.png,image/png',
      'image/svg+xml': '.svg,image/svg+xml',
      'image/webp': '.webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg',
    };

    return types[normalizedMime(mime)] || 'image/*,.svg,.webp';
  }

  function replacementCanBeStored(attachmentMime, replacementMime) {
    attachmentMime = normalizedMime(attachmentMime);
    replacementMime = normalizedMime(replacementMime);

    return (
      attachmentMime === replacementMime ||
      (attachmentMime === 'image/webp' &&
        (replacementMime === 'image/png' || replacementMime === 'image/jpeg'))
    );
  }

  function replaceAttachment($button, file) {
    const cfg = window.spWebpReplace || {};
    const attachmentId = Number($button.data('attachmentId') || 0);
    if (!attachmentId || !file) {
      return;
    }

    const form = new FormData();
    form.append('action', 'sp_webp_replace_attachment_file');
    form.append('nonce', cfg.nonce || '');
    form.append('attachment_id', String(attachmentId));
    form.append('replacement', file);

    setBusy($button, true);

    $.ajax({
      url: cfg.ajaxUrl || window.ajaxurl,
      method: 'POST',
      data: form,
      contentType: false,
      processData: false,
    })
      .done(function (response) {
        if (!response || !response.success) {
          showMessage(responseMessage(response, 'Replace failed.'));
          return;
        }

        showMessage(
          response.data && response.data.message
            ? response.data.message
            : 'Attachment file replaced.'
        );
        window.location.reload();
      })
      .fail(function (xhr) {
        showMessage(requestErrorMessage(xhr));
      })
      .always(function () {
        setBusy($button, false);
      });
  }

  $(document).on('click', '.sp-webp-replace-trigger', function (event) {
    event.preventDefault();

    const $button = $(this);
    if ($button.hasClass('is-busy')) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptForMime($button.attr('data-attachment-mime'));
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    input.addEventListener('change', function () {
      const file = input.files && input.files[0] ? input.files[0] : null;
      document.body.removeChild(input);
      if (!file) {
        return;
      }

      const cfg = window.spWebpReplace || {};
      const maxUploadSize = Number(cfg.maxUploadSize || 0);
      if (maxUploadSize > 0 && file.size > maxUploadSize) {
        const maxMb = Math.max(1, Math.floor(maxUploadSize / 1024 / 1024));
        showMessage('The replacement file is too large. Maximum upload size: ' + maxMb + ' MB.');
        return;
      }

      const attachmentMime = normalizedMime($button.attr('data-attachment-mime'));
      const replacementMime = normalizedMime(file.type);
      if (
        attachmentMime &&
        replacementMime &&
        !replacementCanBeStored(attachmentMime, replacementMime)
      ) {
        showMessage(
          'Use the same image format as the current attachment. WebP attachments also accept PNG or JPEG and convert them automatically.'
        );
        return;
      }

      if (!window.confirm(cfg.confirm || 'Replace this attachment file?')) {
        return;
      }

      replaceAttachment($button, file);
    });

    input.click();
  });
})(jQuery);
