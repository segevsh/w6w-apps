# Stack Exchange

Search and read questions, answers, comments, users, tags and badges across **Stack Overflow** and
the other communities on the Stack Exchange network, over the public **Stack Exchange API v2.3**.

- **Categories** — developer-tools, search
- **Auth methods** — api-key (application `key`, sent as a query parameter)
- **Actions** — 39, all read-only
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  `GET /info`), `quota` (signed `GET /info`, reads `quota_remaining` / `quota_max`) + the derived
  `auth:api-key`
- **Egress allowlist** — `api.stackexchange.com`
- **API docs** — https://api.stackexchange.com/docs (one page per method)
- **Icon** — Simple Icons' Stack Exchange mark from `cdn.simpleicons.org/stackexchange`
  (424 bytes, `image/svg+xml`), downloaded byte-for-byte, not edited. It is not served by the
  vendor itself; the vendor's own favicon was not looked for.

Verified on 2026-10-06 against the docs index and live, unauthenticated probes of every path used
here (each answered the documented wrapper shape, and bad values answered the documented
`bad_parameter` error). v2.3 is the current version; the reference carries no deprecation or
sunset notice for it.

## Actions

| Area | Actions |
|---|---|
| Questions | `question-list`, `question-get`, `question-answer-list`, `question-comment-list`, `question-linked-list`, `question-related-list`, `question-featured-list`, `question-unanswered-list`, `question-no-answer-list` |
| Search | `search`, `search-advanced`, `search-excerpt`, `similar-question-list` |
| Answers / comments / posts | `answer-list`, `answer-get`, `answer-comment-list`, `comment-list`, `post-get` |
| Users | `user-list`, `user-get`, `user-question-list`, `user-answer-list`, `user-badge-list`, `user-tag-list`, `user-reputation-list`, `user-associated-list`, `moderator-list` |
| Tags | `tag-list`, `tag-get`, `tag-wiki-get`, `tag-related-list`, `tag-faq-list`, `tag-top-answerer-list`, `tag-top-asker-list`, `tag-synonym-list` |
| Network | `site-list`, `info-get`, `badge-list`, `privilege-list` |

Every action returns the same shape: `items`, `count`, `hasMore`, `quotaRemaining`, `quotaMax`,
`backoff`, `total`. Page while `hasMore` is true.

## Things most likely to go wrong

1. **Post bodies are not returned by default.** The default filter omits `body`; pass Filter
   `withbody` (a built-in filter) to get it. Excerpts from `search-excerpt` carry a snippet instead.
2. **Every call names a site.** `site` defaults to `stackoverflow`; other communities use their
   `api_site_parameter` (`serverfault`, `superuser`, `askubuntu`, ...; list them with `site-list`).
   `site-list` and `user-associated-list` are network-level and reject a `site` parameter
   (`"This method does not accept a site parameter"`), so those two never send it.
3. **Every error is HTTP 400-ish and the truth is in the body.** `error_id` / `error_name` /
   `error_message` on the wrapper; a wrong `key` is `bad_parameter` with message
   "`key` doesn't match a known application", and a bad `sort` is `bad_parameter` with message
   `sort`. The auth probe reads that body, and only blames the key when the message mentions it.
4. **`backoff` is an instruction, not a hint.** When a result carries `backoff` (seconds), the same
   method must not be called again for that long. It is returned on every result; the app does not
   sleep, so the workflow must. The API also caches heavily: do not repeat an identical request
   inside a minute.
5. **Quota.** Unkeyed calls share 300 requests/day per IP; a registered key is 10,000/day by
   default (throttle docs). More than 30 requests/second per IP gets the IP banned for seconds to
   minutes with an undefined response. The `quota` check reads the live counters.
6. **ID lists.** `{ids}` takes up to 100 IDs, `;`-delimited; the actions accept commas or
   semicolons. Non-numeric IDs in a numeric position are answered `no_method` (404-style), not a
   validation error. `tagged` on `question-list` is an AND of up to 5 tags; on `search` it is an OR.
7. **`search` needs a tag or a title fragment** (`tagged` or `intitle`), `similar-question-list`
   needs a `title`; the API rejects the call otherwise.
8. **Status page.** `stackstatus.com` publishes no machine-readable state (see Health checks).

## Decisions

- **Read-only.** Writes (create/edit/delete, votes, flags, inbox, `/me`) need a per-user OAuth
  `access_token` in addition to the key. The OAuth dance targets `stackoverflow.com/oauth`, a host
  this app does not call, and `/me` routes are meaningless for an application key. Left out.
- **The key is required on the connection** even though the API answers unkeyed: it is the
  credential the app is for (one door, one key), and it lifts the quota 300 -> 10,000.
- **Dates** accept ISO 8601 or Unix seconds and are sent as `fromdate` / `todate`.
- **Sort lists are per method**, copied from each method's reference page; `min`/`max` apply to the
  chosen sort's field; the reference says some sorts, such as `relevance` and `hot`, do not accept them.

## Not covered (documented, left out)

All write methods; the `/me` family and `/inbox`, `/notifications`, `/events` (user-token reads);
`/collectives` and their answers/questions; `/filters/create` and `/filters/{filters}` (filter
building: pass a filter name or id instead); `/revisions` and `/posts/{ids}/revisions`;
`/suggested-edits`; `/badges/name`, `/badges/tags` and `/badges/{ids}/recipients`; `/errors`;
`/tags/moderator-only`, `/tags/required`; `/users/{ids}/mentioned`, `/timeline`, `/top-tags`,
`/favorites` and the other per-user sub-resources not listed above; `/access-tokens`;
`/apps/{accessTokens}/de-authenticate`; and the MCP-server page of the docs.

## Health checks

- `service` — **declared unavailable.** `stackstatus.com` is the real status page, but
  `/api/v2/summary.json`, `/index.json` and `/history.atom` are 404 HTML pages and its only feed,
  `/rss`, is an Atom document titled "Stackstatus Incidents" with an empty `updated` and no
  entries (an incident log, not a current state, and not specific to the API).
  `status.stackexchange.com` 302s to a "site-not-found" page; `stackstatus.net` is behind a
  Cloudflare challenge. Severity `informational`.
- `api` — unsigned `GET /info?site=stackoverflow`; the healthy answer is a 200 wrapper whose
  `items[0].total_questions` is numeric. 5xx (including the API's own 502 `throttle_violation` and
  503) is `down`; a `backoff` field is `degraded`.
- `quota` — signed `GET /info?site=stackoverflow`, `quota_remaining` / `quota_max`: `degraded` at
  90% used, `down` at zero. No reset instant is documented, so none is reported.
- `auth:api-key` (derived) — the same `/info` read with the key; the verdict is taken from the body.
