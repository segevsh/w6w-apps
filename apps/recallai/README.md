# Recall.ai

Send meeting bots to Zoom, Google Meet, Microsoft Teams, Webex and GoTo calls, and read back their
recordings, transcripts, participant events and calendar events, in **Recall.ai** over its REST API.

- **Categories** — video, communication
- **Auth methods** — api-key (`Authorization: Token <key>`, plus a region field)
- **Actions** — 29
- **Health checks** — `service` (declared unavailable, informational: no status page), `api`
  (unsigned reachability on the connection's region host), `quota` (declared unavailable,
  informational) + the derived `auth:api-key`
- **Egress allowlist** — `us-east-1.recall.ai`, `us-west-2.recall.ai`, `eu-central-1.recall.ai`,
  `ap-northeast-1.recall.ai`
- **API docs** — https://docs.recall.ai/reference (index: https://docs.recall.ai/llms.txt)
- **Icon** — the vendor's favicon from www.recall.ai, embedded verbatim (256x256 PNG)

Verified on 2026-10-06 against the per-endpoint OpenAPI documents embedded in the reference pages
and live unauthenticated probes of the US East host. The reference's endpoints are `/api/v1/*`
(bots, recordings, transcripts, usage) and `/api/v2/*` (Calendar V2); the grep for
`deprecat|sunset|will be removed|end of life|depreciat` over the 50 KB docs index found no notice
against any endpoint used here. The older Calendar V1 endpoints are not covered (see below).

## Things most likely to go wrong

1. **Four regions, no discovery, no shared accounts.** US East, US West, EU and Asia are separate
   deployments. A key only works on its own region's host and a key on the wrong host answers
   `authentication_failed` ("might be for another Recall region"). The connection asks for the
   region and `afterConnect` records it. `api.recall.ai` (alias of US East) is deliberately not
   used. Pay-as-you-go signups land in US West, which is the default.
2. **A GET with any body, even `null`, is blocked by Recall's WAF** (403 `request_blocked`). The
   client never attaches a body to a GET.
3. **Calendar objects echo the OAuth client secret and refresh token.** `GET /api/v2/calendars/`
   and `/{id}/` return `oauth_client_secret` and `oauth_refresh_token`; Get Calendar and List
   Calendars strip both before the result reaches a workflow.
4. **Two pagination styles.** Bots are offset-paged (`count`, `page`; `nextPage` here); everything
   else is cursor-paged (`nextCursor`, parsed from the `next` URL).
5. **Create Bot is billed and `507` means no ad-hoc bot was free.** Retry after the `Retry-After`
   the error message carries. The invocation id is sent as `Idempotency-Key` (honoured for one
   hour) on Create Bot, Update Scheduled Bot, Send Chat Message and Create Async Transcript, so a
   retried run does not create a second bot.
6. **Scheduling has a floor.** A scheduled bot cannot be updated (`update_bot_failed`) once it has
   been dispatched or when `join_at` is under ~10 minutes away; delete it and create an ad-hoc
   bot.
7. **Transcripts are download URLs, not inline.** Get Transcript returns `data.download_url` (a
   pre-signed link) once `status.code` is `done`; this app does not fetch it, because the storage
   host is not a documented fixed hostname. Do not poll for bot status; Recall asks for the
   status-change webhooks instead.
8. **Errors are reported by Recall's `code`**: `{code, detail}`, or a field map on a 400. Rate
   limits are per endpoint (lists 60/min, most others 300/min, usage and async transcripts 5/min)
   and a 429 carries `Retry-After`; there are no rate-limit headers, hence no quota reading.

## Actions

| Area            | Actions                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Bots            | bot-list, bot-create, bot-get, bot-update, bot-delete, bot-leave-call, bot-delete-media                                    |
| Bot in the call | bot-send-chat-message, bot-output-audio, bot-start-recording, bot-stop-recording, bot-pause-recording, bot-resume-recording |
| Recordings      | recording-list, recording-get, recording-delete                                                                            |
| Transcripts     | recording-create-transcript, transcript-list, transcript-get, transcript-delete                                            |
| Artifacts       | participant-events-list, meeting-metadata-list                                                                             |
| Calendar V2     | calendar-list, calendar-get, calendar-event-list, calendar-event-get, calendar-event-schedule-bot, calendar-event-unschedule-bot |
| Billing         | usage-get                                                                                                                  |

Create Bot and Update Scheduled Bot take the common settings as fields (name, join time, a
transcript-provider shortcut, metadata) and the rest through `Recording config` and `Other bot
settings`, both raw JSON in Recall's own shape, so any documented option stays reachable.

## Not covered

Create, update and delete of calendars, the calendar access token, update and retrieve of
individual artifacts (audio mixed/separate, video mixed/separate, participant events, meeting
metadata, transcript update, recording update), realtime endpoints, output media, screenshare and
video output, pin participant, Desktop SDK uploads, Calendar V1 (calendar users and meetings),
Google Meet bot login groups and logins, Meeting Direct Connect, Zoom OAuth apps and credentials,
and fetching the pre-signed download URLs themselves.
