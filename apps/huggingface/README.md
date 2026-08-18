# Hugging Face

Search the Hub for models, datasets and Spaces; read repository files and
dataset rows without downloading anything; create and delete repositories; and
run chat inference through the router.

- **Categories** — ai, developer-tools
- **Auth methods** — token
- **Actions** — 14
- **Egress allowlist** — `huggingface.co`, `router.huggingface.co`,
  `datasets-server.huggingface.co`, `cdn-lfs.huggingface.co`,
  `status.huggingface.co`
- **Website** — https://huggingface.co
- **API docs** — https://huggingface.co/docs/hub/api

Verified live against the Hub, the router and the datasets server on 2026-08-18.

## One token, three hosts

Hugging Face is three APIs behind one credential, and which one answers decides
what the failures look like:

| Host | What it serves |
| --- | --- |
| `huggingface.co` | The Hub — repositories, files, identity |
| `router.huggingface.co` | Inference, in OpenAI's shape |
| `datasets-server.huggingface.co` | Rows out of a dataset, without a download |

`api-inference.huggingface.co` — the host most existing code and most tutorials
still use — **no longer resolves**. Not an error response: a connection failure.
It is deliberately absent from the allowlist, because allowing it would turn a
clear DNS failure into a permission-shaped one.

## Repository ids get renamed, and the two hosts disagree about it

Verified live, on the two best-known repositories on the Hub:

| Asked for | Hub | Datasets server |
| --- | --- | --- |
| `gpt2` | **307** → `openai-community/gpt2` | — |
| `squad` | — | **404**, *"The dataset has been renamed"* |

Same cause, two different failures. A stored bare id keeps working on the Hub —
silently, through a redirect — until something depends on the id itself, and
breaks on the datasets server with a 404 that reads like the dataset is gone.

So the client follows the redirect, reports `renamed`, and returns the
**canonical id**, which is what should be stored from that point on. It is the
only signal that a stored id is historical.

## Rate limits are published, under names nothing looks for

```
ratelimit: "api";r=494;t=170
ratelimit-policy: "fixed window";"api";q=500;w=300
```

That is the IETF structured-fields draft, not `X-RateLimit-*`. Nothing in this
pack or in most client libraries looks for those names, so the usual conclusion
is that the Hub publishes no limits at all. It publishes precise ones:
`r` remaining, `t` seconds to reset, `q` the allowance, `w` the window.

## Gating blocks files, not metadata

`meta-llama/Llama-3.1-8B` returns its full card to an unauthenticated caller.
Its files return 403. So a workflow that checks a model exists, reads its
config, and *then* downloads succeeds twice and fails on the third step.

`gated` is `false`, `"auto"` or `"manual"` — the last two differ in whether the
author approves each request, and **neither is accepted by a credential**.
Somebody has to agree to the terms in the web interface. No token fixes this,
and a token is what everything else here is.

## A rejected token says nothing about tokens

```json
{ "error": "Invalid username or password." }
```

There is no username and no password anywhere in this API. Both the auth test
and the client translate it.

The other authentication failure is subtler: a **fine-grained** token names the
repositories it may touch, and one it omits returns 403 on that repository
alone while working everywhere else. That reads as an intermittent fault, and
`whoami` is the fastest way to see it is not.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `whoami` | read | Who this token is and what it may do |
| `model-search` | search | Find models, narrowed by task |
| `model-get` | read | One model's card, config and file list |
| `dataset-search` | search | Find datasets |
| `dataset-get` | read | One dataset's card and configs |
| `dataset-rows` | read | Rows out of a dataset, without a download |
| `space-search` | search | Find Spaces |
| `space-get` | read | One Space's configuration and runtime |
| `repo-files` | read | What a repository actually contains |
| `file-download` | read | A file's contents — configuration, not weights |
| `repo-create` | perform | Create a model, dataset or Space |
| `repo-delete` | perform | Remove a repository, permanently |
| `chat-complete` | perform | Chat inference, OpenAI-shaped |
| `inference-model-list` | read | What can actually be called |

### Things the actions do that the API does not

- **`inference-model-list` exists because the Hub is not the inference
  catalogue.** The Hub hosts hundreds of thousands of models; the router serves
  the few hundred some provider has deployed. A model found through
  `model-search` is very unlikely to be callable, and the failure arrives as a
  404 on the completion rather than as anything useful at search time.
- **`repo-files` sums `lfs.size`, not `size`.** A large file's `size` is the
  size of its **LFS pointer** — about 130 bytes. Summing the wrong field gives a
  repository total wrong by several orders of magnitude, and entirely plausible.
  It also flags `hasSafetensors` and `hasPickle`: a repository shipping only
  `pytorch_model.bin` is a Python pickle, and loading it runs whatever is in it.
  That distinction is invisible on the model card.
- **`repo-create` defaults to private, against the Hub's own default.** A
  repository created by an automation holding a token — a trained model, a
  dataset assembled from internal data — is rarely meant to be public. Turning
  it off logs a warning.
- **`repo-delete` demands the id twice**, because a wrong value destroys the
  wrong repository and the failure surfaces later, to somebody else. Its
  description also says what deletion does *not* do: anybody who pulled or
  forked the repository still has it.
- **`file-download` has a size ceiling and is honest about why.** It is for
  `config.json`, a tokenizer, a README, a small CSV — the files a workflow reads
  to decide something. Weights are gigabytes and do not belong in a workflow's
  data.
- **`dataset-rows` demands `config` and `split`.** Both are the dataset author's
  own names and neither is guessable; guessing `train` works often enough to be
  misleading. It also unwraps the `{row: {...}}` envelope, which is rarely what
  a caller wants.
- **`model-search` promotes `pipelineTag` to a first-class parameter.** It is
  the task, and it is what separates the model you want from a hundred
  fine-tunes, quantisations and ONNX exports of it.
- **Paging reads the `Link` header.** The Hub puts the next cursor in
  `Link: <…?cursor=…>; rel="next"` and nowhere else — not in the body and not in
  the response URL. Reading it off the requested URL returns the cursor of the
  page just fetched, so a paging loop asks for page one forever while looking
  like it works.
- **`chat-complete` pins a provider by suffixing the model** (`model:together`),
  which is the router's own extension to an otherwise OpenAI-shaped body. The
  same model on two providers is two different deployments, with different
  quantisation, context limits and prices — fine for a chat, not for a
  benchmark. Its `temperature: 0` means *unset*, not deterministic, so it is
  omitted rather than sent.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Is Hugging Face itself up |
| `quota` | quota | app | context | Requests left in the current window |

### `service` — the status page is Better Stack, not Statuspage

`status.huggingface.co` answers **HTTP 200 with the page's own HTML** for every
Statuspage-shaped path, `/api/v2/summary.json` included — 746 KB of it. A check
written against the usual convention therefore parses a web page, finds no
incidents in it, and reports healthy forever.

The real route is `/index.json`. The check requires both that shape and the
page's own `company_name`, so the day it moves this reports `unknown` rather
than reading HTML as health.

It is **capped at degraded** even for a full outage, and reports `informational`
severity. The page covers Hugging Face's own services; this app's inference goes
through the router to **third-party providers**, whose outages are not on this
page at all. A green board is not a promise that a completion will work.

### `quota`

A **live** probe of `/api/models?limit=1`, unauthenticated, reading the
structured-fields headers above. It measures the Hub only — the inference
providers have their own limits, reported in their own way or not at all.

An absent header reads as `unknown` and says why it might be absent: a proxy
that forwards only the headers it recognises strips these, because they are not
named `X-RateLimit-*`.

## Icon

`assets/icon.svg`, downloaded verbatim from
`https://huggingface.co/front/assets/huggingface_logo-noborder.svg` on
2026-08-18. Checked with `_tools/icon-legibility.ts`.

## Tests

349 assertions across 20 files: one per action, one per auth method, one per
health check, the client, the shared repository factory, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no `node:` imports, no action touching
a credential — plus one specific to this app: **nothing logs a prompt, a
completion, dataset rows or a file's contents**, checked on the log call's
values rather than its keys, so `count: rows.length` passes and `rows: rows`
does not.
