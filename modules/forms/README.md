# Forms module

Copy this whole directory to another theme. The PHP backend and React UI do not import this site's field engine, routes or components. React and React DOM are peer dependencies. TypeScript uses `@forms/*` to point to `modules/forms/frontend/*`.

## Connect a theme

```php
require_once __DIR__.'/frontend/kit/modules/forms/bootstrap.php';
\FormEngine\boot([
 'post_type'=>'site_form',
 'entry_type'=>'site_entry',
 'block'=>'site/form-builder',
 'modal_type'=>'site_modal',
]);
```

Use stable names for an existing site's storage. Connect your Gutenberg block to `Form`. Call `registerFieldBlocks(parentBlockName)` from `frontend/field-blocks.tsx` in the editor entry point. Native field blocks live inside the form’s `ContentArea`; the parent declares `fieldBlockNames` and `fieldTemplate()` in its schema. `DeliverySettings` mounts its private inspector for the current WordPress form record. The host owns its block schema, registry and theme styling. This site's examples are `src/blocks/elements/forms` and `src/blocks/elements/form-embed`.

Public form definitions contain fields, columns and success behavior only. Delivery settings use a separate administrator-only REST endpoint and private post meta. Never add credentials to Gutenberg attributes, public API data or client environment variables.

## Server configuration

Generate an independent random signing secret of at least 32 characters. Put the SAME secret in the PHP constant `FORM_ENGINE_SECRET` and the Next server environment variable `FORM_ENGINE_SECRET`. Set `FORM_ENGINE_ORIGIN` to the exact frontend origin, including protocol and port. Never prefix these variables with `NEXT_PUBLIC_`.

This project's Next route is a thin wrapper around `formProxy(request,id,{wordpressUrl,secret,allowedOrigin})`. Include `frontend/styles.css` on the frontend and inside the editor. Client `Form` accepts `data`, `formId`, optional `endpoint`, `editor`, `onModal`, `renderHeading` and `renderSubmit`. Theme callbacks handle rich editing and modal display.

Optionally configure `FORM_ENGINE_CLIENT_IP_HEADER` (`x-real-ip`, `x-forwarded-for`, or `cf-connecting-ip`) ONLY when a trusted reverse proxy overwrites that header and prevents direct origin access. Otherwise rate limits use a signed anonymous session cookie plus a global per-form limit. Forwarded IP headers are ignored by default.

## Builder

Forms support text, email, phone, textarea, select, radio, checkbox, number, date, hidden and metric/UTM fields. Field IDs must be unique and stable; templates and webhook payloads use those keys. Required fields, options, numeric bounds, dates and lengths are validated on the server.

Choose a visual layout preset: 100%, 50/50, thirds, 60/40, 40/60, 25/75, 75/25 or quarters. Presets apply widths in order; each field also has its own percentage width control, so different rows can use different layouts. Small screens use one column. Drag field blocks from the native Gutenberg inserter (Form fields category) onto the canvas. Reorder, duplicate or delete them using Gutenberg. Selecting a field opens its key, label, required, options and width controls. Duplicated fields receive a new key automatically. Reordering fields updates their visual and submission order. Field data is stored only in native innerBlocks; the server derives the submission schema from those blocks.

Only settings for the selected submission action are shown. After submission, choose an in-place message, an HTTPS/relative redirect or a published modal. The backend returns the configured action only after storing the private entry. The frontend never accepts an action supplied in submitted values. Missing/unpublished modals fall back to the message.

Insert the **Form** block into a page or select a form in the Consultation section. Both point to the same published form record; editing the record updates every instance. Publish the form before using it on the frontend.

## Delivery & security

Open **Form settings** and use **Save settings**; Gutenberg's page save persists layout and copy separately. Only administrators can read or change destinations and secrets. Blank secret fields keep the saved secret; the explicit Clear control removes it. Secrets are encrypted using Sodium and a key derived from WordPress auth salts. Changing those salts requires re-entering integration secrets. Database backups still contain submitted personal data and must be protected.

- **Email:** up to five recipients, subject, fixed sender, CC/BCC, Reply-To email field and plain-text or sanitized HTML body. Click field tags to insert them: `[name]`, `[email]`, `[_form_title]`, `[_entry_id]`, `[_all_fields]`. Existing placeholders also work: `{{form_title}}`, `{{entry_id}}`, `{{all_fields}}`, `{{field:name}}`. Email acceptance means WordPress accepted the message; configure SMTP/provider delivery for production.
- **Webhook:** public HTTPS URL on port 443, no credentials in URL and no redirects. Private/local addresses are blocked via WordPress safe HTTP validation. JSON payload contains event, entryId, form and validated fields. Check `X-Form-Signature: sha256=<HMAC_SHA256(secret, timestamp + '.' + raw_body)>` and `X-Form-Timestamp`; deduplicate with `X-Form-Event-ID`. Use a random signing secret of at least 32 characters. Receivers should reject stale timestamps and treat repeated event IDs idempotently.
- **Telegram:** bot token and chat ID or @channel. Messages contain plain text; markup parsing is disabled. A bot must have permission to post to that destination.
- **Turnstile:** site key, secret and exact frontend hostname. Tokens are checked server-side for success, expected hostname and action. If enabled and verification is unavailable, submissions are rejected. Loading the widget contacts Cloudflare; account for this in your site's privacy configuration.

Always enabled: same-origin JSON proxy, independent HMAC authentication between Next and WordPress, bounded payloads, honeypot, signed expiring challenge, two-second minimum, one-use challenge claim, atomic client and global limits, schema validation and private entries. These layers reduce abuse; enable Turnstile and infrastructure rate limiting for exposed production sites. No file-upload field is enabled.

Delivery runs on WordPress cron with up to three attempts per enabled channel. Successful channels are not resent on another channel's failure. Entries show queued/accepted/failed state and attempt counts. After fixing settings, an administrator can use **Retry failed channels** in an entry; accepted channels stay unchanged. Configure a real cron runner in production; request-driven WP cron alone has no delivery-time guarantee. Webhook receivers must handle retries idempotently. Retry after an ambiguous provider timeout can still duplicate an email or Telegram message.

No external mail, Telegram, webhook or Turnstile account is provisioned automatically. Enter real credentials, then perform a live delivery check. The integration suite intercepts outbound requests and does not send test messages to real recipients.

## Verification

From the frontend directory:

```sh
npm test
npm run typecheck
npm run build:editor
npx next build --webpack
wp eval-file wp-content/themes/complex-studio/frontend/tests/form-engine.php
```

The PHP suite tests validation, private settings, secret encryption, signature and replay checks, limits and intercepted delivery. Temporary entries are removed at the end.

Reference implementations follow the [WordPress safe HTTP API](https://developer.wordpress.org/reference/functions/wp_safe_remote_post/), [Telegram sendMessage API](https://core.telegram.org/bots/api#sendmessage), and [Turnstile server validation contract](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Hidden fields use a server-owned constant. Metric fields collect only explicitly configured UTM/click IDs or page metadata; URLs have query strings and hashes removed. Custom query keys must start with `utm_`. Optional first-touch session storage is off by default. Metrics are untrusted attribution data, never authentication or authorization. Hidden and metric fields do not occupy frontend grid space.

Load `frontend/editor.css` in the editor chrome as well as the canvas; `frontend/styles.css` contains form layout styles.

Success content: click **Edit success content** to build a nested Gutenberg message with paragraphs, headings, images, buttons and layout blocks. **Preview success message** switches between fields and message editing. Modals are separate Gutenberg records; select one and use **Edit modal in Gutenberg** or **Create modal**. Redirects support a searchable published-page selector (stored by ID, resolved on submission), or a custom relative/HTTPS URL.

Entry details use a read-only card layout with submitted values and per-channel delivery status. Retry is shown only for failed channels; entries without delivery history show an empty state. Entry admin presentation lives in `admin.php` and `admin.css`, loaded only on entry screens.

The Entries list shows form, submitted name/phone, received time and combined delivery status with channel details. A form filter and received-date sorting are available. Contact summaries are derived from saved values using stable keys, phone field type and common localized labels; missing values stay blank. No parallel contact metadata or migration is needed.

Entries search matches submitted names case-insensitively and phone digits independently of spaces, parentheses and hyphens. Delivery status, form and date filters combine. Existing serialized entry snapshots remain the source of truth; filtered searches decode candidates in batches of 200 without creating duplicate contact/status metadata.
