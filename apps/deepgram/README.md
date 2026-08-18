# Deepgram

Transcribe audio and video by URL, analyse text for sentiment, topics and
intent, generate speech, and watch the spend and request history behind it.

- **Categories** — ai, video, developer-tools
- **Auth methods** — api-key
- **Actions** — 19
- **Egress allowlist** — `api.deepgram.com` (the `service` health check adds
  `status.deepgram.com`)
- **Website** — https://deepgram.com
- **API docs** — https://developers.deepgram.com ·
  spec: `https://developers.deepgram.com/openapi.json` (49 operations)

Every path this app calls was checked against that document on 2026-08-18 and
probed live the same day: an unknown path answers `404` while a real one
answers `401`, so the 401s prove the routes exist.

## Setup

### API Key

Deepgram Console → your project → **API Keys**. It is sent as
`Authorization: Token` — **not `Bearer`**.

That distinction matters because Deepgram uses both: `Token` for a long-lived
API key, `Bearer` for the short-lived JWT that `token-grant` mints. The wrong
scheme fails as an authentication error rather than a malformed one.

**Scopes are fixed at creation.** `member`, `admin`, `owner`, and the rest are
chosen when the key is made and cannot be changed, so a key can authenticate
perfectly and be refused by the management endpoints while transcribing
happily. Give it only what the workflow needs.

The project is discovered when the connection is tested, so no action asks for
a project id.

## Three things shape every action here

### 1. Deepgram fetches the media — this app never uploads

`POST /v1/listen` accepts raw audio bytes or `{"url": "…"}`. An App runs in a
sandbox with no local file, so this app only ever sends the URL and lets
Deepgram fetch the media itself. That is not a workaround: the audio never
passes through the workflow at all.

The URL has to be reachable from the public internet, which in practice means a
pre-signed storage URL.

### 2. Long jobs need a callback, and text-to-speech needs one absolutely

`callback` makes a request asynchronous: Deepgram answers immediately with a
`request_id` and POSTs the result to the URL when it finishes.

- For **transcription** it is optional and strongly advisable — an hour of audio
  will outlive whatever HTTP timeout sits in the way, and the work is wasted.
- For **text-to-speech** it is required by this app. `/v1/speak` without a
  callback streams **audio bytes** back, and a workflow step cannot usefully
  hold an MP3: it would be base64-encoded into the run's state and carried
  through every later step. With a callback, Deepgram delivers the audio
  somewhere that can store it.

### 3. Three services, three error shapes

Measured 2026-08-18 with a deliberately invalid key:

| Surface | Shape |
|---|---|
| management (`/v1/projects`) | `{"category","message","details","request_id"}` |
| transcription (`/v1/listen`) | `{"err_code","err_msg","request_id"}` |
| auth (`/v1/auth/*`) | plain text — `Invalid credentials.` |

The client reads all three rather than picking one and rendering the others as
noise.

## Actions

| Key | Type | Description |
|---|---|---|
| `audio-transcribe` | perform | **Transcribe audio or video from a URL** |
| `text-analyze` | perform | Sentiment, topics, intents and summary over text |
| `speech-generate` | perform | Text to speech, delivered to a callback |
| `token-grant` | perform | A 30-second JWT so a browser never holds the key |
| `model-list` | read | Speech models and TTS voices |
| `project-list` | read | Projects this key reaches |
| `project-get` | read | This connection's project |
| `usage-get` | read | Requests and **audio hours** |
| `usage-breakdown-get` | read | The same spend, grouped |
| `usage-fields-list` | read | Which tags and models actually appeared |
| `request-list` | read | The request log, filterable to failures |
| `request-get` | read | What happened to one request |
| `balance-list` | read | Remaining pre-paid credit |
| `key-list` | read | Which credentials reach this project |
| `key-create` | perform | Mint a key — **value returned once** |
| `key-delete` | perform | Revoke one, immediately |
| `member-list` | read | Who has access |
| `member-scope-list` | read | What one person may do |
| `invite-list` | read | Pending grants `member-list` cannot see |

## Two options that are governance decisions

### `mip_opt_out` — whether your content trains Deepgram's models

Left off, submitted audio and text **may be used to improve Deepgram's models**.
For customer calls, medical dictation or anything under an NDA that is a
decision somebody should make deliberately rather than inherit from a default,
so `audio-transcribe` and `speech-generate` both surface it. Opting out carries
a pricing impact, which is exactly why it is a parameter rather than a hard-coded
choice either way.

### `redact` — PII removed before the transcript is returned

`pii`, `pci`, `ssn`, `numbers`. On call recordings this is often the difference
between a transcript that may be stored and one that may not.

## Five things that go wrong quietly

### 1. A callback means nothing has happened yet

`audio-transcribe` with a callback returns a `request_id` and no transcript. A
workflow that treats the response as the result gets an empty string. `pending`
is returned as an explicit boolean for that reason.

When the callback never arrives — the receiving endpoint was down, the URL was
wrong, the audio could not be fetched — `request-get` is the only place that
says which.

### 2. Deepgram meters concurrency, not requests per minute

A `429` here means **too many requests are in flight at once**, not that a quota
is exhausted. The documented pay-as-you-go ceilings are 50 concurrent
pre-recorded transcriptions, 150 streaming, 15 TTS REST and 5–10 for audio
intelligence, with growth and enterprise higher.

The fix is fewer parallel steps. A retry loop that backs off and then fires
everything again at once hits it exactly as hard the second time, so the error
message says so.

### 3. Hours are what you are billed on, not requests

Ten thousand voicemails can cost less than a hundred conference recordings.
`usage-get` totals both and labels the hours as the billed figure.

`tag` is the only way to attribute spend to a workflow rather than to Deepgram
as a whole — and tags are not configured anywhere, they exist because some
request carried one, which is what `usage-fields-list` is for.

### 4. No balance is not the same as no credit

`balance-list` and the `quota` health check read pre-paid credit. An **invoiced
enterprise project has no balance at all** and returns an empty list. Treating
that as zero credit would page somebody about a healthy account, so `hasBalance`
is returned explicitly and the health check reports `unknown` rather than
`down`.

Where there *is* a balance, running out **stops** transcription rather than
slowing it — which is what makes this one of the few genuinely actionable
numbers an API exposes.

### 5. A key's value exists for one response only

`key-create` returns it and Deepgram never shows it again. A workflow that
creates a key without storing it in the same run has made an unusable
credential that still counts against the project; the only fix is to delete it
and make another. The value is returned and never logged.

`key-delete` is the counterpart, and it is gated — **deleting the key this
connection uses breaks it and every workflow on it**, and nothing in the API
reports which id the current credential corresponds to.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Are the surfaces this app uses up? |
| `quota` | quota | **How much credit is left** — a real reading |
| `concurrency` | quota | Declared absence — see below |

`service` reads `status.deepgram.com` per component and counts only what this
app calls: `Batch API`, `TTS API`, `Usage API` and `Management APIs`. **Streaming
and Voice Agent are deliberately excluded** — they are WebSocket surfaces this
app cannot reach, and their outage says nothing about whether these actions
work. Each counted surface is reported by name, so a TTS outage beside a healthy
batch API reads as the partial answer it is.

`quota` is a genuine reading rather than a declared absence, which is rare
enough to note. It reads `GET /v1/projects/{id}/balances` and reports remaining
credit as real headroom. The low-water threshold is deliberately generous
because running out does not degrade anything — it stops the work — so noticing
at 10% of a balance is noticing a week early rather than an hour late. A key
without the scope, and an invoiced project with no balance, both report
`unknown` with the reason rather than a false alarm.

`concurrency` is the **declared absence**, and it exists separately because
Deepgram's two limits are different things. Its documented ceilings are per plan
and per surface, there is no endpoint reporting current concurrency, its
reference names no status code or `Retry-After` / `X-RateLimit-*` header for the
limit, and a probe would have to *be* a concurrent request to measure
concurrency — measuring the thing by consuming it. The consequence is surfaced
where it can be acted on: on the `429` itself.

## What this app deliberately does not do

- **Streaming.** Deepgram's real-time transcription is a WebSocket, which a
  workflow step cannot hold open. `token-grant` exists precisely so the client
  that *can* hold one never needs the API key.
- **Voice Agent.** A conversational agent is a long-lived bidirectional session,
  not a step in a graph.
- **Upload audio bytes.** The sandbox has no file to send, and the URL form is
  the better pattern anyway.
- **Manage members, invitations or project settings as writes.** Reading them is
  an access review; granting access from a workflow is a decision for the
  console.
- **Self-hosted distribution credentials.** They provision on-premise
  deployments, which is infrastructure rather than automation.

## Errors

A failure carries whichever of Deepgram's three shapes it arrived in, with the
`request_id` when there is one — that is what support asks for. A `401` or `403`
names the key's scopes as a possible cause, because scopes are fixed at creation
and a narrow key authenticates fine and is refused per endpoint. A `429` says
concurrency rather than rate.
