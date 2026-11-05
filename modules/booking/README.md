# Booking module

Self-contained studio booking: public widget, calendar admin, tariffs, Telegram bot, notifications and anti-flood limits. Everything lives in this folder; the host connects it explicitly.

## Connecting to a project

Requires `frontend/kit/admin-ui`, `frontend/kit/ui` and the theme block engine (`@kit/core`).

1. PHP, one integration file (see `inc/integrations/booking.php`):

```php
require_once dirname(__DIR__, 2).'/frontend/kit/modules/booking/bootstrap.php';
\SiteTheme\Booking\boot([
    'timezone'=>'Europe/Kyiv',       // defaults to the WordPress timezone
    'timezone_label'=>'Київ',
    'phone_code'=>'380',
    'phone_digits'=>9,
    'language'=>'uk',
    'assets_url'=>get_theme_file_uri('build/booking'),
    'assets_path'=>get_theme_file_path('build/booking'),
    'signing_secret'=>SITE_PREVIEW_SECRET,
    'frontend_url'=>SITE_FRONTEND_URL,
    'blocks'=>'SiteTheme\\blocks',    // parses post content into the block payload
]);
```

2. Blocks: require `blocks/form/register.php` and `blocks/section/register.php` in the PHP registry, and add both to `src/blocks/registry.ts` and `editor-registry.ts`.
3. Next route, `app/api/booking/[resource]/route.ts`:

```ts
import { bookingRoutes } from '../../../../modules/booking/frontend/route';
import { wordpressUrl } from '@/lib/cms';
export const runtime = 'nodejs';
export const { GET, POST } = bookingRoutes(wordpressUrl);
```

4. Styles in `globals.css`: `@source` for `frontend` and `blocks`, `@import` of `frontend/styles.css`.
5. Build: `scripts/build-booking.mjs`.

## Blocks

`site/booking-form` goes into modals and page content: `variant="modal"` is set by the modal renderer, otherwise it is `inline`. `site/booking-section` is the same form as a page section. Gutenberg shows the live form, read-only.

## Languages

Ukrainian is the source. PHP and admin JS use `t('Український текст')`; that text is the message id. The form uses named keys from `languages/uk.json`.

To add a language, create `languages/<code>.json`:

```json
{ "form": { "submit": "Book now" }, "messages": { "Бронювання №": "Booking #" } }
```

Missing keys fall back to Ukrainian. Once a second file exists, a language selector appears in booking settings; the choice covers the form, notifications and the admin. Texts edited under "Тексти й повідомлення" override the file, and only changed values are stored.

Not routed through languages yet: interpolated template strings in admin JS, proxy errors in `frontend/route.ts`, and form texts shown before the configuration loads.

## Validation

`frontend/validation.ts` gives instant feedback with error codes; WordPress repeats every check. Server errors return a `code`, and the form shows `error_<code>` from the texts when it exists.

# Booking details administration — calendar and management

Entry point: `inc/bootstrap.php` → `booking/bootstrap.php`. WordPress → **Бронирования**.
The UI uses the shared admin tokens from the Icons reference, with a Russian interface as explicitly requested by the user. Client-facing copy remains Ukrainian.

Implemented:

- FullCalendar week/month/day views, hourly grid, Kyiv timezone, client/time on events and full details in an accessible modal. Clicking empty time opens a creation modal. Calendar refetches on focus and after creation.
- Private `site/v1/admin/bookings` GET/POST and GET by ID, requiring WP session, REST nonce and booking capability.
- Manual confirmed bookings (payment recorded as outside the site, editable amount) and time blocks.
- Search by client name/phone, date/status filters, pagination, entry details and creation history.
- Weekly working hours, pricing and future integration settings, with validation. Existing bookings retain their price snapshot; settings show reservations outside revised working hours.
- Kyiv local input/display, UTC persistence, integer minor currency units.
- InnoDB transactions for client, booking, hourly slots and event creation. Unique `(hall_id, starts_at)` rejects collisions, including blocks; conflicts roll back the entire operation.
- Version-checked, row-locked rescheduling with atomic slot replacement; conflicts retain the original interval. Studio moves preserve the client reschedule count; client-requested moves increment it. Reminder state resets after a successful move. Manual duration/recorded amount may change; online duration stays fixed.
- Confirmed booking cancellation with or without refund, soft removal of blocks and manual refund acknowledgement. Refunds for offline payments remain pending until explicitly marked paid outside the site; no automatic bank payout is implied. Online refund cancellation returns an explicit unavailable error until a provider is connected.
- Shared custom date/time/select/checkbox controls from `frontend/kit/admin-ui`, including keyboard navigation and modal-safe popovers.
- WP session, `manage_bookings` capability and nonce-protected writes. The administrator role receives the capability on installation; assigning booking access to other roles is deliberate host configuration.

Tables are `$wpdb->prefix . site_booking_{clients,bookings,slots,events,refunds}`; settings are `site_booking_settings`. These names follow the repository's neutral `site_*` convention rather than the draft specification's `studio_*` identifiers. Schema migration runs on authenticated administrator access and retries if tables are unavailable. No credentials are stored.

Manual bookings may start at any future whole hour within the configured horizon and working hours; client minimum notice will apply to the public creation flow. Blocks require a reason and may cover time outside opening hours (up to 24 hours per entry).

Not yet implemented: dragging/resizing, no-show action, online payments/refunds and provider, Telegram/outbox or scheduled tasks. Public booking now confirms immediately without payment, using the same atomic slot ledger. Payment mode is explicitly unpaid; no payment or refund is implied.

## Verification

`wp eval-file wp-content/themes/complex-studio/frontend/tests/bookings.php --user=<administrator>`

Uses disposable records and restores settings in `finally`; no bank or Telegram calls. On MAMP, supply its MySQL socket to the PHP CLI if needed. PHP syntax and browser checks cover the list, calendar, block creation, booking details modal and Russian labels. Build admin assets with `npm run build:booking`; `build:editor` also includes them.

Mutation routes (WP session + REST nonce + `manage_bookings`):

- `POST /site/v1/admin/bookings/{id}/reschedule`: local `date`, `time`, `hours`, `reason` (`client`/`studio`), `version`; optional manual `amount` in UAH.
- `POST /site/v1/admin/bookings/{id}/cancel`: boolean `refund`, `version`. Blocks are retained with `cancelled_at`, no booking status/payment.
- `POST /site/v1/admin/bookings/{id}/refund-done`: `version`; confirms an offline pending refund only.

Schema version 2 adds cancellation audit fields and the manual refund ledger. Existing records remain intact. Rescheduling may not target past time or exceed the booking horizon/working hours; administrators bypass client minimum notice, 24-hour and reschedule-count limits.

Weekly opening/closing times accept any minute (e.g. 21:30); booking starts and durations remain whole hours. A booking must end no later than the configured minute-precise closing time.

The calendar time axis follows working hours: week view uses the earliest opening and latest closing across visible days; day view uses that weekday's exact schedule, including minutes. Closed days show an empty-state message. Night rows are omitted and clicking a closed interval does not open creation. Records outside revised working hours remain accessible in the booking list and settings warning.

Creation and rescheduling use duration buttons backed by `GET /site/v1/admin/bookings/availability?date=YYYY-MM-DD&time=HH:MM&type=booking|block&exclude_id=ID`. The private endpoint returns contiguous `max_hours` from the slot ledger. Choices refresh on date/start/type changes and focus; stale responses are discarded and submission stays disabled while checking or when no duration fits. Rescheduling excludes the entry's own slots; online entries retain their fixed duration. Block choices retain the existing up-to-24-hour policy outside opening hours. Mutations always recheck conflicts transactionally.


The module owns public booking UI/settings, media-library image selection and tariffs. Public `GET /site/v1/booking/config`, `GET /site/v1/booking/availability` and `POST /site/v1/booking/reservations` are proxied by Next.js. Creation validates the active tariff, minimum duration, minimum notice, horizon, working hours and client contact; totals are computed server-side. Request UUIDs provide idempotent retries; unique hourly slots reject concurrent collisions. Confirmation returns only a booking number and status. Contact email and tariff snapshot are retained in the creation audit; no email or Telegram is sent. Public entries use `payment_mode=unpaid` and can be cancelled without refund. Run `frontend/tests/public-booking.php` for disposable integration coverage.

## Notification delivery

`notifications.php` owns a transactional outbox and per-booking Telegram links. `notification-admin.php` adds **Бронирования → Уведомления** with Telegram/Email channels, group pairing, a test message and delivery history. The bot token is supplied only by `SITE_BOOKING_TELEGRAM_TOKEN` in server configuration or environment; it is never included in config API responses. Bot identity is saved from `getMe` during setup.

Each public confirmation includes a bearer deep link for that booking. The link is usable until the end of the booking, only in a private chat, and cannot switch to a second chat after linking. `/stop` detaches that chat and cancels its pending notifications. No phone-number lookup or automatic association of future bookings is performed. A group is paired with a one-use, 15-minute command issued to an authenticated booking administrator. Bots need only ordinary group membership.

Booking creation/mutations write notification jobs in the same database transaction; network delivery happens afterwards. Unique keys suppress repeated enqueueing; delivery is at-least-once (an ambiguous network failure may cause Telegram to receive a repeat). Workers retry transient errors up to six attempts, record permanent errors and can be retried from the admin screen. Telegram `sendMessage` acceptance is recorded as sent; `wp_mail` acceptance means only that the configured mail transport accepted the message, not inbox delivery. Email is disabled until a sender and a real transport are configured.

For local development or a supervised production process:

```
wp site-booking telegram-run --user=<administrator>
wp site-booking telegram-run --once --user=<administrator>
```

The continuous command polls Telegram and drains the outbox. Do not run another consumer for this bot. Option leases coordinate it with the one-minute WP-Cron fallback. WP-Cron depends on site traffic; production requires a supervised worker or an actual system cron. Local MAMP requires the CLI socket option documented above. Stop/restart the long-running worker after code updates. No public webhook is installed or local tunnel exposed.

Checks: `wp eval-file wp-content/themes/complex-studio/frontend/tests/notifications.php --user=<administrator>` uses disposable records and mocks all Telegram HTTP calls. Stop live workers while running integration fixtures. API reference: https://core.telegram.org/bots/api ; deep links: https://core.telegram.org/bots/features#deep-linking .

### Telegram moderation

Group notifications include **Перенести**, **Отменить** and **Обновить** callback buttons. Only current human administrators/owners of the configured Telegram group may use them; each callback rechecks `getChatAdministrators`. Callbacks are signed and include the booking version. Transfers show available dates, valid contiguous start times and an explicit before/after confirmation while preserving duration and price. Cancellation also requires confirmation and performs no refund. Both use the same transactional services as WordPress, enqueue notices to the group and the booking's linked private chat, and audit `telegram:<user_id>`. Stale actions cannot overwrite newer changes. Automatic group-to-supergroup migration updates the configured recipient and pending jobs.

`frontend/tests/telegram-moderation.php` verifies permissions, tampered/stale callbacks, confirmations, conflicts, audit identity and delivery to both recipients using a mocked Telegram transport. Run with live workers stopped. Existing messages without controls may be superseded by a new current management card without modifying the booking.

### Client self-service in Telegram

`telegram-client.php` adds private-chat `/bookings` and signed `cl|...` controls to the link confirmation and subsequent client messages. A button is scoped to its chat, booking and version. Ownership is rechecked against the per-booking link inside the mutation transaction; `/stop` removes mutation access. Group moderation remains a separate callback namespace and permission path.

Clients keep duration and price, respect minimum notice for the new time, the configured `cancellation_hours` cutoff for moving the original session, and `reschedule_limit`. A successful client move increments the existing counter. Unpaid future bookings can be cancelled with explicit confirmation regardless of the move cutoff, freeing slots and notifying both parties. Cancellation of paid entries is directed to the studio until the provider flow exists; no refund is simulated. Neither begun sessions nor stale buttons can be changed by clients. `/bookings` lists up to ten linked upcoming bookings. Audit records distinguish `client-telegram:<id>` from `telegram:<moderator-id>`.

`frontend/tests/telegram-client.php` covers private-chat ownership, forwarded/stale controls, deadlines, duration, limits, stop/revocation, audit, confirmations and notifications using disposable records and a mocked transport.

### Contact identity and studio conversations

`identity.php` resolves submitted booking names/phones from immutable creation-event snapshots in a batch query. Calendar/list/detail therefore show the booking's submitted identity rather than an older shared client name. Telegram link schema v2 stores verified username and first/last name per binding. Existing profiles may be refreshed using Bot API `getChat`; future private messages and client callbacks refresh them. Admin detail exposes one consistent binding state, nickname and a direct `t.me` contact link when a username exists.

The public confirmation polls `POST /site/v1/booking/status` using the unpredictable original request UUID (not a booking ID, phone or email). The endpoint returns only that request's booking timing/state and linked Telegram profile; responses are not cached. It allows the open confirmation to reflect linking without a reload. Admin details refresh on focus and every ten seconds while open, preserving active editor forms.

`telegram-support.php` adds text conversations without requiring a public Telegram username. Clients select **Написати студії** on a linked booking. The bot relays the text to the configured group with a booking reference; current group administrators can reply to the bot's message or use **Написать клиенту**. Only mapped bot message IDs route replies, and each delivery rechecks the current per-booking binding. Unrelated group chatter is never relayed. Private **/close** ends the selected conversation and **/stop** revokes binding access and pending deliveries. Attachments are not relayed in this initial text flow.

Administrators may also send text through nonce/capability-protected `POST /site/v1/admin/bookings/{id}/message` from the detail card; a copy is queued to the group. Replies use the same outbox and per-message route table, `site_booking_telegram_replies`. Live workers must be restarted after code updates. `frontend/tests/booking-contact.php` verifies snapshots, profile/status synchronization, private request access, both conversation directions and authorization with a mocked Telegram transport.

### Booking chat and attachments

`booking-chat.php` stores a chronological chat history in `site_booking_chat_messages`, separate from booking audit events, with delivery status joined to the outbox. Existing text relay messages are imported once. Admin `GET /admin/bookings/{id}/messages` returns the latest 100 messages; `before` paginates older history. The modal chat updates independently so polling does not replace a draft or selected attachment. Repeated admin requests use a request key and repeated Telegram updates share the existing unique delivery key.

The admin composer accepts up to 10 files per message, up to 100 MiB total and 10 MiB per file (JPG/PNG/WebP, PDF, TXT/CSV, ZIP, DOCX/XLSX). A message with an attachment accepts up to 800 characters to fit Telegram captions. Files upload sequentially before one atomic message commit. Multiple files use `sendMediaGroup` as one document album, preserving originals; single files use `sendDocument`. Telegram file IDs are reused. Incoming Telegram documents and photos are associated only through an authorized linked conversation and appear in the same history. Oversized files are rejected.

Locally uploaded files are encrypted with AES-256-GCM using a key derived from `secure_auth` salts. The uploads folder has additional Apache access-denial/index files; URLs to stored ciphertext are never returned. Preserve salts with server backups: changing them without migrating files makes existing encrypted uploads unreadable. Downloads go through nonce/session/capability-protected, booking-scoped REST endpoints and are served as attachments with `nosniff`. JPEG/PNG/WebP attachments also have inline previews: encrypted cached thumbnails reserve their layout space, and clicking opens the original. Other file types remain download links. Telegram download URLs containing the bot token remain server-side; downloads are bounded to the same size limit. No HTML/SVG/executable uploads or archive extraction are allowed.

Install the chat tables and outbox attachment column with `SiteTheme\Booking\install_chat()` as an administrator (also runs on admin initialization), then restart long-running workers. `frontend/tests/booking-chat.php` verifies encrypted storage, upload/type/size checks, outbound multipart, inbound documents, history/deduplication/status and authenticated booking-scoped download access with a mocked Telegram transport.

### Telegram booking topics

Enable Topics in the connected studio supergroup and give the bot Manage Topics rights. `install_telegram_topics()` adds a group-scoped booking/topic mapping. Every new notification, chat message, and album for the studio group is delivered into the booking's topic; existing messages remain in the original chat. Topic creation is serialized and reused. API/permission failures retry through the outbox instead of silently mixing conversations. The topic introduction explicitly warns that administrator messages are relayed to the customer.

An authorized administrator can write consecutive text or file messages directly in a booking topic without replying to an individual bot message. General chat remains internal; non-admin senders, unknown topics and cross-booking reply routes cannot forward messages. Legacy explicit replies still work. Customer dialog selection persists for 30 days and renews on messages. A lone linked confirmed booking can be selected automatically; multiple bookings require an explicit selection, and `/close` disables that automatic selection until the customer reopens a dialog. Delivery acknowledgments are throttled during file batches.

New-booking cards are also queued once into General (the studio's «Заявки» topic, thread 1), with a single deep link to the booking conversation. An explicit outbox `thread_id` keeps these summaries out of conversation routing and prevents recursive summary creation. The separate topic welcome contains only conversation instructions, without repeating the booking card.

Each booking topic has a stored, automatically pinned control card. Booking changes refresh that card in place. The information feed only contains the deduplicated creation summary and its conversation link. Moderation dialogs always include their target thread; legacy controls outside that thread are replaced with a navigation link and cannot perform mutations. Reply-to-client buttons are omitted inside topics because plain administrator messages already relay to the customer.

### Client booking rules

The editable `site_booking_settings.rules` text is appended to creation-confirmation emails when the email channel is configured and enabled. Linked Telegram clients receive it as a separate message on creation or initial bot linking. Keys scoped to booking/chat/part prevent repeated linking from duplicating rules; long Unicode text is split into 3500-character parts. Rules are not posted into the administrator information feed or repeated on reschedule/cancellation. Empty rules produce no extra messages.

### Administrative history cleanup

The list and calendar share the same detail/chat dialogs. List entries open without page navigation and their date/status refresh after loading a changed record. Administrators can preview a full cleanup of cancelled/completed bookings and removed blocks; active records and pending refunds are excluded. The preview token is user-bound, expires after ten minutes and fingerprints selected versions; changed records require a fresh preview. Deletion requires typing УДАЛИТЬ, rechecks eligibility under row locks and removes related local messages/files/events/outbox/link/topic mappings atomically. Only orphaned clients are removed. Encrypted files and thumbnail caches are unlinked after commit. The Telegram conversation itself is retained. Notification delivery is leased during deletion. `frontend/tests/booking-history.php` tests with isolated fixtures only.

### Completion and attendance

`lifecycle.php` transitions ended, confirmed studio bookings to `completed` under the same row/version lock as other mutations. A separate minute cron, the Telegram CLI loop and administrator page initialization catch up due records. Completion is audited once, leaves financial fields and conversation/files intact, and notifies the studio topic and linked client; it never posts another item to the information feed. The pinned control card refreshes with the new status.

After the rental end an administrator can mark a confirmed/completed booking `no_show` in WordPress or through a signed Telegram confirmation. The client no-show counter increments in the same transaction, with version/status protection against duplicates. This records attendance only, with no charge/refund or payment-state change. No-show notifications go to the studio only. Completed records remain accessible through `/bookings`, with chat/file access and no transfer/cancel controls. The website confirmation renders completed/no-show separately from cancellation. `frontend/tests/booking-lifecycle.php` covers lifecycle, authorization, attendance, financial preservation and retained chat using isolated fixtures.

## Visitor IP and anti-flood

`app/api/booking/[resource]/route.ts` sends the visitor IP to WordPress as a signed header (key derived from `PREVIEW_SECRET`/`SITE_PREVIEW_SECRET`); unsigned or forged values fall back to `REMOTE_ADDR`. By default the last `x-forwarded-for` entry is used; set `SITE_CLIENT_IP_HEADER` to `x-real-ip` or `cf-connecting-ip` to match your proxy. The IP is used only for limits and is not stored with bookings.

Public booking: honeypot, 20 attempts a minute per IP, optional Turnstile, 5 new bookings a day per public IP, `unpaid_limit` per phone, and a site-wide breaker of 30 bookings an hour (`site_booking_public_hourly_limit`) that alerts the group once an hour. Turnstile turns on when both `SITE_TURNSTILE_SITE_KEY` and `SITE_TURNSTILE_SECRET` are set as wp-config constants or environment values, and it fails closed.

Telegram bot: outside the studio group each account gets 30 updates a minute and 300 an hour; excess updates are dropped. Clients relay 10 messages a minute to the group. Greetings and "no bookings" replies go out once per 10 minutes per chat. Booking notices are delivered before generic replies, and a Telegram 429 pauses the batch for `retry_after` without consuming attempts.

`lifecycle.php` queues client reminders (`reminder_hours`, skipped for bookings made inside that window) and the daily group digest (`digest_time`). `hold_minutes` and `invoice_minutes` stay stored for the payment integration and have no admin field.

Optional `SITE_BOOKING_ENCRYPTION_KEY` and `FORM_ENGINE_ENCRYPTION_KEY` (32+ characters) replace the WordPress salt as the encryption key. Setting or changing a key makes data encrypted with the previous key unreadable.
