# Azure DevOps

Work an Azure DevOps organization — repositories and pull requests, pipeline
runs and their artifacts, and work items queried with WIQL.

- **Categories** — version-control, devops, project-management
- **Auth methods** — pat
- **Actions** — 19
- **Egress allowlist** — `dev.azure.com`, `vssps.dev.azure.com` (the `service`
  health check adds `status.dev.azure.com`)
- **Website** — https://azure.microsoft.com/products/devops
- **API docs** — https://learn.microsoft.com/rest/api/azure/devops ·
  specs: `github.com/MicrosoftDocs/vsts-rest-api-specs`,
  `specification/{core,git,build,wit}/7.1/*.json`

Every path this app calls was checked against those documents on 2026-08-18 and
probed live.

## Setup

### Organization and personal access token

The organization is the name in `dev.azure.com/<organization>`. The token comes
from **User settings → Personal access tokens**.

It is sent as HTTP Basic with an **empty username** and the token as the
**password** — the reverse of most Basic-auth APIs, and easy to get backwards.

### Grant the areas the workflow needs

Tokens are scoped **per area**: Code, Build, Work Items, Project and Team. A
token missing one authenticates perfectly and then answers **`404`**, as though
the resource did not exist — see below.

## Three things shape every action here

### 1. A rejected credential answers `302`, not `401`

Probed 2026-08-18. A request with a bad token returns:

```
HTTP/1.1 302 Found
Location: https://spsprodwus24.vssps.visualstudio.com/_signin?realm=dev.azure.com&reply_to=…
```

— a redirect to an interactive sign-in page. **A client that follows redirects
gets `200 OK` and a page of HTML**, which parses as neither JSON nor an error,
and the workflow sees a successful call that returned nothing.

Every request here sends `redirect: "manual"` and treats any 3xx as an
authentication failure, with a message saying the token has expired or been
revoked. A test asserts the redirect mode.

### 2. A missing scope answers `404`, not `403`

Azure DevOps returns `404` for a resource the token cannot see, not only for one
that does not exist. So "the project name is wrong" and "this token has no
Project and Team scope" are the same response, and only one of them is fixable
by correcting the workflow.

`project-list` is the diagnostic: an empty list on a real organization is
almost always a missing scope, and both the connection test and the
`organization` health check say so rather than reporting an empty account.

### 3. `api-version` is required on every request

Not a default and not optional. The client appends `api-version=7.1` to every
call, pinned rather than tracking `-preview` versions whose response shapes move
without notice.

## Actions

| Key | Type | Description |
|---|---|---|
| `project-list` | read | The projects this token can **see** |
| `repository-list` | read | Repositories in a project, disabled ones apart |
| `repository-get` | read | One repository and its default branch |
| `branch-list` | read | Branches or tags — Azure DevOps has only refs |
| `commit-list` | read | History, filterable to a release window |
| `pull-request-list` | read | Pull requests, defaulting to active |
| `pull-request-get` | read | One PR, with reviewer votes counted |
| `pull-request-create` | perform | Open one — **as a draft by default** |
| `pull-request-thread-create` | perform | Comment, on the overview or the diff |
| `build-list` | read | Pipeline runs, results and running counted apart |
| `build-get` | read | One run, with `finished` and `succeeded` |
| `build-queue` | perform | **Run a pipeline** |
| `build-cancel` | perform | Ask a run to stop |
| `build-definition-list` | read | Pipelines, and which are broken |
| `build-artifact-list` | read | What a run produced |
| `work-item-get` | read | One item, raw fields and a flattened view |
| `work-item-create` | perform | Create — **as a JSON Patch document** |
| `work-item-update` | perform | Change named fields |
| `work-item-query` | search | **WIQL, with the fields actually fetched** |

## Work items are the odd corner of the API

### They take a JSON Patch document, not an object

Creation and update post a list of operations:

```json
[{"op": "add", "path": "/fields/System.Title", "value": "Fix login"}]
```

as **`application/json-patch+json`**. Posting a plain object fails with an error
that mentions neither the patch format nor the content type. This app takes a
friendly `{title, state, …}` object and builds the document.

### Fields are namespaced, and there is no `title`

`System.Title`, `System.State`, `System.AssignedTo`,
`Microsoft.VSTS.Common.Priority`. A caller writing `title` is **not corrected** —
the field is simply not set, and the work item is created without it.

So short names are qualified for you, and anything containing a dot is passed
through untouched, which is how a custom field (`Custom.TeamArea`) works.
`work-item-get` returns both the raw namespaced `fields` and a flattened view
under short names, because dropping the raw object would lose the custom fields.

### WIQL returns ids, not work items

This is the trap `work-item-query` exists to close. A WIQL query answers with
`workItems: [{id, url}]` — **no fields at all**, whatever the `SELECT` clause
said. A workflow that runs a query and reads `System.Title` from the result gets
nothing, and the query looked like it worked.

Getting the data is a second call to the batch endpoint, which caps at **200**
ids. This action does both, in batches, and reports `totalMatched` separately
from what it returned — a report saying "200 bugs" when the query matched nine
hundred is worse than one that admits it truncated.

### The type is in the path, and the process decides which exist

`Bug` and `Task` exist everywhere; **Agile has `User Story` and Scrum has
`Product Backlog Item`**. A workflow hard-coding one breaks against a project
using the other.

`bypassRules` is deliberately not offered. Skipping the process rules from an
automation is how a board ends up with items in states its own reports do not
recognise; if a transition is genuinely wrong, the process is the thing to
change.

## Five smaller sharp edges

### 1. `result` does not exist until a run finishes

`status` is where a run is; `result` is how it turned out, and it is **absent
until `status` is `completed`**. A workflow checking `result === "failed"` on a
running build reads `undefined` and concludes it passed.

**`partiallySucceeded` is not a pass.** A step failed and was configured to
continue, so `build-get` reports `succeeded` only for `succeeded` — a deployment
gated on "did the build pass" should stop and ask.

### 2. Branch names are refs in some places and bare in others

Pull request endpoints want `refs/heads/main`. `commit-list` wants `main`. Both
in the same API. This app normalises in both directions, so the same value works
everywhere.

An unrecognised **search filter is ignored rather than rejected**, so a bare
branch name in a pull request query silently returns the unfiltered default
rather than failing.

### 3. `status` defaults to Active on pull request search

Combined with the point above: a mistyped filter leaves the default in place
while looking filtered, so a report that meant to count everything counts only
what is open.

### 4. Reviewer votes are an enum wearing a number's clothes

`10` approved, `5` approved with suggestions, `0` no vote, `-5` waiting for the
author, **`-10` rejected**. Summing or averaging them produces nonsense.
`pull-request-get` counts them by name instead.

`mergeStatus` is a separate field: a pull request can be approved by everyone
and unmergeable because of a conflict, and the two never mention each other.

### 5. A comment is a thread, and where it hangs changes what it means

Azure DevOps has no bare comments. Without a file the thread appears in the
overview — right for a build result. With a file and line it appears **on the
diff**, which is where a linter's output is actually useful.

An **`active`** thread blocks the merge where policy requires comments resolved.
That is what a failing check should do and what an informational note should
not, so the status is a first-class parameter.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Are Repos, Pipelines and Boards up — **in which region**? |
| `organization` | dependency | Does this organization answer, and what can the token see? |
| `quota` | quota | Declared absence — see below |

`service` reads Azure DevOps's own structured endpoint,
`status.dev.azure.com/_apis/status/health`, which is better than a Statuspage:
it reports **per service and per geography**. The services map almost exactly
onto this app — `Core services`, `Repos`, `Pipelines`, `Boards` — so a Pipelines
outage with healthy Repos is reported as the partial answer it is. `Test Plans`
and `Artifacts` are ignored, being surfaces this app never calls.

Health is per geography, and an organization lives in one. The connection cannot
know which — Azure DevOps does not expose it on any endpoint this app calls — so
the check takes the **worst** state and **names the affected regions**. That is
the honest reading rather than a comfortable one: it will occasionally warn
about a region you are not in, and because it says which, the reader can dismiss
it in a second. Picking a geography and being quietly wrong fails in the
direction that matters.

`organization` is where the scope problem surfaces, and reports a `302` as an
expired token specifically, since nothing else would.

`quota` is a **declared absence**, and the mechanism is the reason. Azure DevOps
meters **throughput units** rather than requests — each call costs in proportion
to the work it causes, over a five-minute sliding window — so a hundred cheap
calls pass unnoticed while five expensive ones throttle. Its `X-RateLimit-*`
headers appear **only as the limit is approached**, and `Retry-After` only once
requests are being delayed. A response comfortably inside the limit carries
none of them, so **silence means healthy**, and a poll would report `unknown` on
every healthy run and produce a number only when things were already wrong.
Measuring would also spend the units being measured.

## What this app deliberately does not do

- **Delete or abandon anything.** Repositories, pipelines, work items and pull
  requests can all be destroyed through this API. A deleted repository goes to a
  recycle bin; a deleted pipeline does not.
- **Complete or merge a pull request.** Merging is the decision branch policies
  exist to govern, and an API call that bypasses a human is the wrong shape for
  it.
- **Edit pipeline definitions or branch policies.** Both are configuration that
  belongs in version control, not in a workflow step.
- **Manage users, groups or permissions.** The Graph API is a separate surface
  and granting access is not an automation.
- **Test Plans, Artifacts feeds, wikis, service hooks.** Each is a large surface
  of its own; this app covers Repos, Pipelines and Boards.

## Errors

A `3xx` is reported as a rejected credential, because that is what it is. A
`404` warns that a missing scope looks identical to a missing resource. A `401`
or `403` names the per-area scopes. Errors otherwise carry Azure DevOps's
`message` plus its machine-readable `typeKey`, since the message alone is often
ambiguous between two different causes.
