# Ollama

Run prompts, chats and embeddings against your own Ollama server, and manage the
models on it.

- **Categories** — ai, developer-tools
- **Auth methods** — server (host, port, scheme, optional API key)
- **Actions** — 11
- **Egress allowlist** — `*`
- **Website** — https://ollama.com
- **API docs** — https://github.com/ollama/ollama/blob/main/docs/api.md

Built against the official REST API reference and exercised against a running
Ollama 0.34.1 server on 2026-10-22.

> **On the allowlist.** Ollama is software you run, so the server can be at any
> address — the `*` is what admits it, as in `homeassistant`. There is no vendor
> host and no status host.

## Setup

### Connecting: where is your server?

You tell the app where the server is when you connect it:

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| **Host** | yes | — | IP address or hostname only, e.g. `192.168.1.50`. No `http://`, no port, no path. |
| **Port** | no | `11434` | 1–65535. |
| **Scheme** | yes | `http` | `https` only when a reverse proxy or tunnel terminates TLS in front of Ollama. |
| **API Key** | no | — | Only if a reverse proxy in front of Ollama requires a bearer token. |

The three address fields are assembled into one origin by `buildBaseUrl` in
`lib/client.ts`, and nowhere else. It refuses a pasted URL, credentials or a
path in the host, a port inside the host field, a port outside 1–65535 or that is
not plain digits, any scheme but http/https, and an address the URL parser would
read differently from what was typed (`192.168.1.050`). IPv6 may be typed bare
or in brackets.

**Why `custom` auth.** Ollama itself has no authentication. The auth types the
contract defines are `oauth2`, `apiKey`, `basic`, `bearer`, `custom`,
`tenantAuth` and `jit`; `apiKey`, `basic` and `bearer` all imply a secret, and
`tenantAuth`/`jit` are host-sourced with no user fields. `custom` is the one that
carries just connection fields, with a `sign` hook that adds
`Authorization: Bearer <key>` **only when a key was entered**. A bare server
never receives that header.

### The server has to be reachable from where workflows run

This is the first thing that goes wrong, and it is not an Ollama problem.

- A **LAN or localhost** address (`192.168.x.x`, `10.x`, `localhost`, `.local`)
  works only when workflows run **on the same network** — a self-hosted runner.
  A hosted runner cannot see it. Use a tunnel or a reverse proxy with a public
  hostname instead.
- Ollama **binds `127.0.0.1` by default**, so even a machine on the same LAN is
  refused until the server is started with `OLLAMA_HOST=0.0.0.0` (and the
  firewall allows the port).

The connection test reports an unreachable host in those words, naming whether
the address is a private one, rather than a bare timeout. It also tells apart a
server that wants a key (401 with none entered), one that rejected the key, and a
port that answers but is not Ollama (a proxy or login page — no `version` in
`/api/version`).

## Actions

Everything is **non-streaming**: calls that can stream send `stream: false`, so a
step gets one result.

| Action | Type | Endpoint | What it does |
| --- | --- | --- | --- |
| `generate` | perform | `POST /api/generate` | One completion from a prompt; system prompt, images, JSON / JSON-Schema output, thinking, options |
| `chat` | perform | `POST /api/chat` | The next assistant message for a messages array; images, tools, structured output |
| `embed` | perform | `POST /api/embed` | Embedding vectors for one text or a batch |
| `model-list` | read | `GET /api/tags` | Installed models |
| `model-show` | read | `POST /api/show` | One model's capabilities, context length, template, parameters |
| `model-running` | read | `GET /api/ps` | Models loaded in memory, and whether each is fully on the GPU |
| `model-pull` | perform | `POST /api/pull` | Download a model — **blocks until finished** |
| `model-delete` | perform | `DELETE /api/delete` | Remove a model |
| `model-copy` | perform | `POST /api/copy` | Give an installed model another name |
| `model-unload` | perform | `POST /api/generate` (`keep_alive: 0`) | Free a loaded model's memory now |
| `version` | read | `GET /api/version` | The server's Ollama version |

### Things the actions do that the API does not

- **`model-pull` can take a very long time.** With streaming off the request
  does not answer until the whole download is done — minutes for a small model,
  far longer for a large one, with no progress in between. A step timeout or a
  proxy read timeout (nginx defaults to 60 s) can cut it first; the pull usually
  keeps going on the server, so check `model-list` before retrying. Re-pulling a
  current model is cheap, which is why it is safe to retry.
- **`chat` is stateless.** Ollama keeps no conversation; send the whole history
  every call. `toolCalls` are returned but never executed.
- **`format` takes `json` or a JSON Schema**, as text. When set, `parsed` carries
  the decoded reply; a truncated reply is left as text rather than thrown.
- **Images are raw base64.** A `data:image/png;base64,` prefix, which people copy
  out of other tools, is stripped.
- **`keepAlive` numbers are numbers.** The form delivers `"0"` and `"-1"` as
  strings, which Ollama would read as durations; bare numbers are sent as numbers.
  `0` unloads at once, `-1` keeps the model forever, `10m` is a duration.
- **`options` plus four named ones.** `temperature`, `seed`, `numPredict` and
  `numCtx` are named because they are the common ones; anything else
  (`top_k`, `stop`, …) goes in `options`, and a named param wins over the same
  key there. A prompt longer than `num_ctx` is silently truncated by Ollama.
- **Errors say what to do.** An unknown model is a 404 pointing at `model-list`
  and `model-pull`; a 401/403 is named as coming from a reverse proxy, since
  Ollama has no auth; a 502/503/504 is named as a gateway that could not get an
  answer from Ollama.
- **`model-delete` of a missing model is an error**, not a quiet success, so a
  typo does not look like it worked.

### Left out

- `POST /api/create`, `POST /api/push` and blob upload/check — building and
  publishing models needs files or an ollama.com account and does not fit a
  one-result step.
- Streaming of any kind.
- The OpenAI-compatible `/v1/*` surface — use the `openai` app against
  `…/v1` if you want it.
- Ollama's cloud and web-search endpoints, which are separate from a local
  server.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | — | Declared unavailable — no vendor status page exists |
| `instance` | dependency | connection | signed | Is this server answering `GET /api/version` |
| `quota` | quota | connection | — | Declared unavailable — no limits to report |

### `instance`

The one real check. `/api/version` is the lightest call Ollama has — no model is
loaded and nothing is listed — so probing it every two minutes costs the server
nothing. It is signed through the same hook as everything else, so a server
behind a proxy is probed with its key and a bare one without. A connection that
cannot be reached is `down` (and says a private address needs a runner on that
network); a 401/403 is `unknown`, because the derived `auth:server` check owns
credential failures; a 200 without a `version` is `degraded` — the host answers
but it is not Ollama.

### `service` and `quota`

Both are declared absences, `informational`, so they do not leave the app at
`unknown`. Ollama is self-hosted software with no status page for a server you
run — none is invented here — and it has no rate limit or usage endpoint. What
limits a server is hardware: requests queue behind the model
(`OLLAMA_NUM_PARALLEL`, `OLLAMA_MAX_QUEUE`; a full queue answers 503) and memory
decides how many models stay loaded (`model-running`).

## Icon

`assets/icon.png` is Ollama's own mark, downloaded from
`https://ollama.com/public/ollama.png` on 2026-10-22 (181×256) and centred on a
transparent 256×256 canvas so the host's square tile does not squash it; the
artwork pixels are untouched. It is black ink on transparency, which is
illegible on a dark tile (`_tools/icon-legibility.ts`), so
`assets/icon.dark.png` is the same shape reversed to white and is declared as
`appearance.darkMode.icon`.

## Tests

84 assertions across 18 files: one per action, the auth method, each health
check, the client (including a table of hostile and malformed hosts and ports),
and `index.ts`. The `index.ts` suite also enforces the pack-wide sandbox rules on
this app's own source — no global `fetch`, no `Deno.*`, no credential handling
outside the auth hook, no logging of prompts or replies — and that every call
that can stream sets `stream: false`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```
