# Facebook Messenger

Send and receive-side management for a Facebook Page's Messenger inbox through the
[Messenger Platform](https://developers.facebook.com/docs/messenger-platform/): the Send API,
Conversations API, Messenger Profile API, Attachment Upload API, the Page Status API and
Conversation Routing thread control.

- **Categories** — communication
- **Auth methods** — `page-token` (bearer)
- **Actions** — 19
- **Egress allowlist** — `graph.facebook.com`
- **Graph version** — `v26.0` (pinned in `lib/client.ts`; the version every request example in the
  Messenger docs carried on 2026-10-06)
- **API docs** — https://developers.facebook.com/docs/messenger-platform/

Not to be confused with `facebook` (Page posts, comments, photos, insights) or `whatsapp`; this app
shares only the Graph host with them.

## Auth setup

Messenger needs a **Page access token** — the docs require "a Page access token requested from the
Page sending the message". There is no `oauth2` method: `sign` is the only hook that sees a credential
and it cannot swap a User token for a Page token.

1. In your Meta app add the **Messenger** product and connect the Page.
2. Generate a Page access token (Messenger → API setup), preferably long-lived.
3. The token needs `pages_messaging`. Reading conversations additionally needs `pages_manage_metadata`
   and `pages_read_engagement`, and the token must come from a person who can perform the
   `MESSAGING` or `MODERATE` task on the Page. Reading conversations with people who hold no role on
   your app needs **Advanced Access**.
4. Paste it into the connection. The connection is labelled with the Page's name.

Every action takes an optional **Page ID** (default `me`, which a Page token resolves to its own
Page). The Messenger Profile actions always use `me`, as the docs do.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `send-text-message` | perform | `POST /{page}/messages` (`message.text`) |
| `send-attachment` | perform | `POST /{page}/messages` (`message.attachment`, URL or saved id) |
| `send-button-template` | perform | `POST /{page}/messages` (button template, 1–3 buttons) |
| `send-generic-template` | perform | `POST /{page}/messages` (generic template / carousel, ≤10 elements) |
| `send-quick-replies` | perform | `POST /{page}/messages` (`message.quick_replies`, ≤13) |
| `send-sender-action` | perform | `POST /{page}/messages` (`typing_on`, `typing_off`, `mark_seen`, `react`, `unreact`) |
| `list-conversations` | read | `GET /{page}/conversations?platform=messenger` (optional `user_id`) |
| `list-conversation-messages` | read | `GET /{conversation-id}?fields=messages` (follow `paging.next` via `pageUrl`) |
| `get-message` | read | `GET /{message-id}?fields=…` |
| `get-page-status` | read | `GET /{page}/page_status` |
| `get-messenger-profile` | read | `GET /me/messenger_profile?fields=…` |
| `set-messenger-profile` | perform | `POST /me/messenger_profile` (any properties; the route for `get_started`, `whitelisted_domains`, `account_linking_url`, `commands`) |
| `set-greeting` | perform | `POST /me/messenger_profile` (`greeting`) |
| `set-ice-breakers` | perform | `POST /me/messenger_profile` (`ice_breakers`, localized format) |
| `set-persistent-menu` | perform | `POST /me/messenger_profile` (`persistent_menu`) |
| `delete-messenger-profile-fields` | perform | `DELETE /me/messenger_profile` (`{"fields":[…]}`) |
| `upload-attachment` | perform | `POST /{page}/message_attachments` (URL, `is_reusable: true`) |
| `pass-thread-control` | perform | `POST /{page}/pass_thread_control` |
| `take-thread-control` | perform | `POST /{page}/take_thread_control` |

All Send API and Messenger Profile calls send a JSON body; the thread-control calls send query
parameters (`recipient={"id":"<PSID>"}`, `target_app_id`, `metadata`) exactly as Conversation Routing
documents them. Errors are raised from Graph's error body (`error.code` / `error_subcode` /
`error.message`), including an error envelope that arrives on an HTTP 200.

### Things the actions do not paper over

- **Messaging window.** A Page can only message a person who contacted it first. `RESPONSE` and
  `UPDATE` need the standard window (24 hours, up to 7 days after a Click-to-Messenger ad); outside it
  use `MESSAGE_TAG` with a tag. Since 2026-04-27 Meta rejects the tags `CONFIRMED_EVENT_UPDATE`,
  `ACCOUNT_UPDATE` and `POST_PURCHASE_UPDATE` with error 100; `HUMAN_AGENT` remains.
- **Recipient IDs** are Page-scoped IDs (PSIDs). App-scoped Facebook Login IDs do not work.
- **Messenger Profile rate limit** is 10 calls per 10 minutes per Page. Ice breakers and the Get
  Started button interact (API ice breakers take precedence), and the persistent menu only shows once
  a Get Started button is set. A Page-level menu update can take up to 24 hours to appear.
- **Conversation reads.** `list-conversation-messages` returns ids and times; only the 20 most recent
  messages of a conversation can be read with `get-message`. Requests-folder conversations idle for 30
  days are not returned.
- **Attachment IDs** from `upload-attachment` are private to the Page and expire after 90 days.
- `messagingType` and `tag` are free strings. The documented `messaging_type` literal is `RESPONSE`; the
  `UPDATE` and `MESSAGE_TAG` literals come from the Send API reference, which is a JavaScript shell with
  no machine-readable text, so they were not re-verified against it.

## Not yet covered

Left out because the page that defines them was not readable (the Send API reference, Attachment
Upload reference and the Greeting / Get Started / Persistent Menu property pages are JavaScript
shells) or because they need binary data, which the workflow sandbox does not carry:

- Multipart file upload (`filedata`) for Send API and Attachment Upload — URL-based only.
- Multiple-image messages (`message.attachments[]`, ≤30 images), coupon, product, receipt, media and
  other templates beyond button and generic.
- Private replies (recipient by comment or post id), one-time notifications, marketing messages,
  sponsored messages, utility messages, Personas, custom labels, and the user-level persistent menu
  (`/me/custom_user_settings`).
- Conversation Routing: `release_thread_control`, `request_thread_control`, `extend_thread_control`,
  `thread_owner` and the `thread_control` parameter on a send. The Get Started button has no dedicated
  action (use `set-messenger-profile` with `{"get_started":{"payload":"…"}}`; the inner shape was not
  readable in the docs, only that `get_started` is an object carrying the payload).
- Webhook intake (messages, postbacks, deliveries, reads). This app has no triggers.
- Instagram messaging, which shares the Send API but needs different permissions and recipients.

## Icon

`assets/icon.svg` is the Messenger bubble from
[simple-icons](https://github.com/simple-icons/simple-icons/blob/develop/icons/messenger.svg),
fetched from `raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/messenger.svg` on
2026-10-06 and saved byte-for-byte (575 bytes; `cmp` against the download is clean). It is single-colour
black, which is illegible on the dark tile, so `assets/icon.dark.svg` is the same path re-inked white by
`_tools/icon-legibility.ts fix facebook-messenger` (`appearance.darkMode.icon`). Run `deno task fmt`,
never bare `deno fmt`, which rewrites SVG assets.

## Health checks

| Check | Kind | Notes |
|---|---|---|
| `api` | dependency (app scope, unsigned) | `GET /v26.0/me?fields=id` with no credential. Graph answers HTTP 400 `{"error":{"type":"OAuthException","code":2500,…}}` (measured 2026-10-06), which passes — a schema-correct auth error proves reachability. A 5xx or a non-JSON body is `down`; JSON that is not a Graph error envelope is `unknown`. The verdict reads the body, not the status. |
| `service` | ~~declared absence~~ | `metastatus.com` is a JavaScript shell with no JSON API or feed, so the absence is declared with `severity: "informational"` (otherwise it would pin the app at `unknown`). |
| `quota` | quota (signed, informational) | `GET /me?fields=id`, reading `X-App-Usage` (percent consumed across call count, CPU time and total time; throttling at 100). |
| `auth:page-token` | derived | From `auth.test`: `GET /me?fields=id,name`. Judged from the body — error code 190 is a dead token. The response carries the Page's id and name, never the credential. |

Verification: `deno task validate && deno task check && deno task lint && deno task fmt && deno task test`
from this directory (in the `api` container: `/app/packages/apps/apps/facebook-messenger`).
