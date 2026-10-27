# Ollama Cloud

Run prompts, chats and embeddings against Ollama's hosted cloud API with an API
key.

- **Categories** — ai
- **Auth methods** — api-key (bearer)
- **Actions** — 5
- **Model types** — llm, embedding
- **Egress allowlist** — `ollama.com`
- **Health checks** — service (declared absent), instance, quota
- **Website** — https://ollama.com
- **API docs** — https://github.com/ollama/ollama/blob/main/docs/api.md

The cloud serves the same `/api/*` surface a local Ollama server speaks, so the
request and response shapes here are the ones `io.w6w.ollama` documents. What
differs is everything around the call: the origin is fixed, the key is
mandatory, and there are no models to manage.

## Setup

### Connecting: an API key, and nothing else

| Field | Required | Notes |
| --- | --- | --- |
| **API Key** | yes | Mint one at https://ollama.com/settings/keys. |

There is no host, port or scheme field. A local Ollama server is reached at an
address the user types, which is why `io.w6w.ollama` collects one and admits
`*` in its allowlist; the cloud is a single vendor host, so `BASE_URL` in
`lib/client.ts` is the constant `https://ollama.com` and the manifest names it
exactly.

Every request is signed with `Authorization: Bearer <key>` by the auth `sign`
hook — the actions never touch the key, and it is never written into the
connection display.

The connection test calls `GET /api/tags`, the lightest call that proves the key
is accepted: a 401/403 is reported as a rejected key, not as an outage.

## Actions

| Action | Type | Endpoint | What it does |
| --- | --- | --- | --- |
| `Generate a completion` | perform | `POST /api/generate` | One completion from a prompt: system prompt, images, JSON/Schema output, sampling options. |
| `Chat with a model` | perform | `POST /api/chat` | The next assistant message for a whole conversation, with tools and images. |
| `Create embeddings` | create | `POST /api/embed` | One vector per input, string or batch. |
| `List models` | read | `GET /api/tags` | The models this account can call, with size, family, parameter size and capabilities. |
| `Get service version` | read | `GET /api/version` | The Ollama Cloud version answering the key — and the cheapest "is it up" call. |

Everything is non-streaming: `stream: false` on every call that can stream,
because a workflow step wants one value.

### No model management

The cloud API exposes no pull, copy, delete or unload — model management stays
with the vendor — so this app has no such actions, unlike `io.w6w.ollama`. A
model the account cannot call is simply absent from `List models`, and asking
for it returns 404.

### No keep-alive

How long a model stays resident is the vendor's business on a hosted service, so
the keep-alive field a local server takes has no analogue here. `loadSeconds` is
still reported: a model that was unloaded before the call has to be read back in
first.

## Health

| Check | Kind | Scope | What it answers |
| --- | --- | --- | --- |
| `service` | service | app | Declared absent (`unavailable`): the vendor publishes no machine-readable status feed. |
| `instance` | dependency | connection | Does `GET /api/version` answer with this key? A 401/403 is `unknown` — the auth check owns credential failures. |
| `quota` | quota | connection | Requests left in the current limit window, read off `ratelimit-*` / `x-ratelimit-*` response headers. `informational`: running low is worth showing, not worth failing a verdict over. |

The quota check reports `unknown` when a response carries no rate-limit headers,
rather than guessing: the vendor documents no usage endpoint and no header
contract.

## Layout

```
index.ts            the AppDefinition
package.json        the manifest (id, displayName, modelProvider, allowlist)
lib/client.ts       BASE_URL, param parsing helpers, error mapping, the fetch client
auth/api-key.ts     bearer auth: sign + connection test
actions/            generate, chat, embed, model-list, version
health/             service (unavailable), instance, quota
tests/              unit tests for every action, auth, health and the client helper
```

## Tests

```sh
deno task check
deno task test
```
