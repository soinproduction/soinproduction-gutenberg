import { SelectControl } from '../../../ui/select.js';
import { useEffect, useRef, useState } from 'react';
declare const wp: any;
export function DeliverySettings() {
  const id = wp.data.useSelect((select: any) => select('core/editor').getCurrentPostId(), []);
  const fields = wp.data.useSelect((select: any) => {
    const collect = (nodes: any[]): any[] =>
      nodes.flatMap((block) =>
        block.name.startsWith('form-engine/field-')
          ? [{ ...block.attributes.field, type: block.name.slice('form-engine/field-'.length) }]
          : collect(block.innerBlocks ?? [])
      );
    return collect(select('core/block-editor').getBlocks());
  }, []);
  const [data, setData] = useState<any>(null),
    [status, setStatus] = useState(''),
    [dirty, setDirty] = useState(false),
    [open, setOpen] = useState(false),
    [preview, setPreview] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { PanelBody, TextControl, ToggleControl, Button, Notice, Modal, TabPanel, } =
    wp.components;
  useEffect(() => {
    let active = true;
    if (id)
      wp.apiFetch({ path: '/form-engine/v1/forms/' + id + '/settings' })
        .then((value: any) => {
          if (active) setData(value);
        })
        .catch(() => {
          if (active) setStatus('Administrator access is required for delivery settings.');
        });
    return () => {
      active = false;
    };
  }, [id]);
  const update = (key: string, value: any) => {
    setData({ ...data, [key]: value });
    setDirty(true);
    setStatus('Unsaved changes');
  };
  const text = (key: string, label: string, type = 'text', placeholder = '') => (
    <TextControl
      label={label}
      type={type}
      value={data?.[key] ?? ''}
      placeholder={placeholder}
      onChange={(v: string) => update(key, v)}
    />
  );
  const toggle = (key: string, label: string) => (
    <ToggleControl
      label={label}
      checked={Boolean(data?.[key])}
      onChange={(v: boolean) => update(key, v)}
    />
  );
  const secret = (key: string, label: string) => (
    <div className="fe-secret-field">
      {data?.[key + 'Saved'] && (
        <span className="fe-secret-badge">
          <span className="dashicons dashicons-lock" aria-hidden="true" />
          Saved securely
        </span>
      )}
      {text(
        key,
        label,
        'password',
        data?.[key + 'Saved'] ? 'Leave blank to keep saved value' : 'Enter ' + label.toLowerCase()
      )}
      {data?.[key + 'Saved'] && (
        <div className="fe-secret-clear">
          <ToggleControl
            label={'Remove saved ' + label.toLowerCase()}
            checked={Boolean(data['clear_' + key])}
            onChange={(v: boolean) => update('clear_' + key, v)}
          />
        </div>
      )}
    </div>
  );
  const channel = (
    key: string,
    title: string,
    description: string,
    icon: string,
    children: React.ReactNode
  ) => (
    <section className={'fe-channel-card' + (data?.[key] ? ' is-enabled' : '')}>
      <header className="fe-channel-header">
        <span className="fe-channel-icon">
          <span className={'dashicons dashicons-' + icon} aria-hidden="true" />
        </span>
        <div className="fe-channel-heading">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="fe-channel-switch">{toggle(key, 'Enable ' + title)}</div>
      </header>
      {data?.[key] && <div className="fe-channel-content">{children}</div>}
    </section>
  );
  const tags = [
    ...new Set<string>(fields.map((field: any) => String(field.id)).filter(Boolean)),
    '_form_title',
    '_entry_id',
    '_all_fields',
  ];
  const insert = (tag: string) => {
    const el = bodyRef.current;
    const body = data.emailBody ?? '[_all_fields]';
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? start;
    update('emailBody', body.slice(0, start) + '[' + tag + ']' + body.slice(end));
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    });
  };
  const save = () => {
    setStatus('Saving…');
    wp.apiFetch({ path: '/form-engine/v1/forms/' + id + '/settings', method: 'POST', data })
      .then((value: any) => {
        setData(value);
        setDirty(false);
        setStatus('Settings saved');
      })
      .catch((e: any) => setStatus('Could not save: ' + (e.code ?? 'invalid settings')));
  };
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
    );
  const previewBody = (data?.emailBody ?? '[_all_fields]').replace(
    /\[([a-zA-Z_][\w-]*)\]/g,
    (_match: string, key: string) =>
      escape(
        key === '_all_fields'
          ? fields.map((f: any) => (f.label || f.id) + ': example').join('\n')
          : key === '_form_title'
            ? 'Example form'
            : key === '_entry_id'
              ? '123'
              : fields.find((f: any) => f.id === key)?.type === 'email'
                ? 'visitor@example.com'
                : 'Example ' + key
      )
  );
  const mail = channel(
    'emailEnabled',
    'Email notifications',
    'Send form submissions to your inbox.',
    'email-alt',
    <>
      <div className="fe-settings-grid fe-mail-routing">
        {text('recipient', 'To', 'text', 'recipient@example.com')}
        {text('subject', 'Subject', 'text', 'New message: [_form_title]')}
      </div>
      <details className="fe-settings-advanced">
        <summary>
          Sender & additional recipients <span>From, Reply-To, CC, BCC</span>
        </summary>
        <div className="fe-settings-grid">
          {text('fromEmail', 'From email', 'email', 'wordpress@your-domain.com')}
          {text('fromName', 'From name', 'text', 'Your website')}
          <SelectControl
            label="Reply-To"
            value={data?.replyToField ?? ''}
            options={[
              { label: 'No Reply-To', value: '' },
              ...fields
                .filter((f: any) => f.type === 'email')
                .map((f: any) => ({ label: f.label + ' [' + f.id + ']', value: f.id })),
            ]}
            onChange={(v: string) => update('replyToField', v)}
          />
          {text('cc', 'CC (optional)')}
          {text('bcc', 'BCC (optional)')}
        </div>
        <p className="fe-help">
          Use an address from your domain as the sender. Visitor email belongs in Reply-To.
        </p>
      </details>
      <div className="fe-template-heading">
        <div>
          <h3>Message template</h3>
          <p>Write your email and insert values from the form.</p>
        </div>
        <Button variant="secondary" onClick={() => setPreview(!preview)}>
          {preview ? 'Hide preview' : 'Preview email'}
        </Button>
      </div>
      <div className="fe-template-layout">
        <label className="fe-mail-body">
          <span className="screen-reader-text">Message body</span>
          <textarea
            ref={bodyRef}
            aria-label="Message body"
            rows={10}
            value={data?.emailBody ?? '[_all_fields]'}
            onChange={(e) => update('emailBody', e.target.value)}
          />
        </label>
        <aside className="fe-mail-tags">
          <span className="fe-setting-label">Insert a field</span>
          <p>Click a tag to add its value to the message.</p>
          <div>
            {tags.map((tag: string) => (
              <button type="button" key={tag} onClick={() => insert(tag)}>
                {'[' + tag + ']'}
              </button>
            ))}
          </div>
        </aside>
      </div>
      <div className="fe-mail-format">
        {toggle('emailHtml', 'HTML email')}
        <span>Use HTML for a custom email layout.</span>
      </div>
      {preview &&
        (data?.emailHtml ? (
          <iframe
            title="Email preview"
            sandbox=""
            className="fe-mail-preview"
            srcDoc={
              '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src data:"><body>' +
              previewBody +
              '</body>'
            }
          />
        ) : (
          <pre className="fe-mail-preview">{previewBody}</pre>
        ))}
    </>
  );
  const integrations = (
    <div className="fe-channel-stack">
      {channel(
        'webhookEnabled',
        'Webhook',
        'Send a signed JSON request to your endpoint.',
        'admin-links',
        <>
          {text('webhookUrl', 'Endpoint URL', 'url', 'https://example.com/webhook')}
          {secret('webhookSecret', 'Signing secret')}
          <p className="fe-inline-note">
            <span className="dashicons dashicons-shield" aria-hidden="true" />
            HTTPS only · HMAC SHA-256 · Secret: at least 32 characters
          </p>
        </>
      )}
      {channel(
        'telegramEnabled',
        'Telegram',
        'Get a notification in a chat or channel.',
        'format-chat',
        <>
          {secret('telegramToken', 'Bot token')}
          {text('telegramChat', 'Chat ID or @channel', 'text', '-100… or @your_channel')}
        </>
      )}
      <p className="fe-inline-note">
        <span className="dashicons dashicons-info-outline" aria-hidden="true" />
        Track each channel’s status and retry failed deliveries in Entries.
      </p>
    </div>
  );
  const security = (
    <div className="fe-channel-stack">
      {channel(
        'turnstileEnabled',
        'Cloudflare Turnstile',
        'Add a verification step to block automated submissions.',
        'shield',
        <>
          {text('turnstileSiteKey', 'Site key')}
          {secret('turnstileSecret', 'Secret key')}
          {text('turnstileHostname', 'Frontend hostname', 'text', 'example.com')}
        </>
      )}
      <section className="fe-protection-card">
        <h3>
          <span className="dashicons dashicons-yes-alt" aria-hidden="true" />
          Built-in protection
        </h3>
        <p>These checks are always active.</p>
        <ul>
          {[
            'Server-side validation',
            'Signed, expiring challenge',
            'Replay protection',
            'Honeypot & timing checks',
            'Submission rate limits',
            'Encrypted integration secrets',
          ].map((label) => (
            <li key={label}>
              <span className="dashicons dashicons-yes" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
  return (
    <wp.blockEditor.InspectorControls>
      <PanelBody title="Mail & integrations" initialOpen={false}>
        <p>Configure email, integrations and anti-spam in one place.</p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Form settings
        </Button>
        {dirty && <p className="fe-help">Unsaved delivery changes</p>}
      </PanelBody>
      {open && (
        <Modal
          title="Form settings"
          className="fe-settings-dialog"
          size="large"
          onRequestClose={() => setOpen(false)}
        >
          {!data ? (
            <p>{status || 'Loading…'}</p>
          ) : (
            <>
              <TabPanel
                tabs={[
                  { name: 'mail', title: 'Mail' },
                  { name: 'integrations', title: 'Integrations' },
                  { name: 'security', title: 'Security' },
                ]}
              >
                {(tab: any) => (
                  <div className="fe-settings-tab">
                    {tab.name === 'mail'
                      ? mail
                      : tab.name === 'integrations'
                        ? integrations
                        : security}
                  </div>
                )}
              </TabPanel>
              <div className="fe-settings-footer">
                <span role="status">
                  <span
                    className={'dashicons dashicons-' + (dirty ? 'edit' : 'lock')}
                    aria-hidden="true"
                  />
                  {status || 'Private form settings'}
                </span>
                <Button variant="primary" disabled={!dirty || status === 'Saving…'} onClick={save}>
                  Save settings
                </Button>
              </div>
              {status.startsWith('Could') && (
                <Notice status="error" isDismissible={false}>
                  {status}
                </Notice>
              )}
            </>
          )}
        </Modal>
      )}
    </wp.blockEditor.InspectorControls>
  );
}
