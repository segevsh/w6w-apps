/**
 * Buffer — social scheduling on the **GraphQL Public API** (`api.buffer.com`).
 *
 * ## Read this first: which Buffer API
 *
 * Buffer has had two developer surfaces and almost everything written about
 * "the Buffer API" before mid-2026 describes the wrong one. The legacy REST API
 * (`api.bufferapp.com/1/`, launched 2012) stopped accepting new developer app
 * registrations years ago and retires **2027-02-01**, with brownouts on
 * 2026-11-11 and 2026-12-09. For most of the last decade the honest answer to
 * "can you build a Buffer integration?" was *no*.
 *
 * That changed in May 2026. The GraphQL Public API is generally available,
 * credentials are self-serve on **every plan including Free**, and OAuth
 * clients are self-serve too. This app is built entirely against that surface;
 * nothing here touches the legacy API.
 *
 * ## The one thing most likely to be got wrong
 *
 * **A failed mutation returns HTTP 200 with no `errors` array.** Buffer's
 * mutations return unions whose error arms live inside `data`:
 * `{"data":{"createPost":{"message":"Text is required"}}}` is a *failure* that
 * `res.ok` calls a success. Every mutation here selects `__typename` and a
 * `... on MutationError { message }` catch-all, and routes its payload through
 * `BufferClient.mutate`, which throws on any arm that is not a declared success
 * type. `lib/client.ts` documents all three of Buffer's failure modes and the
 * wire evidence for each.
 *
 * ## Shape of the surface
 *
 * The schema has exactly nineteen root fields — ten queries and nine mutations
 * — and six of them are flagged **⚠️ Experimental** by Buffer itself. This app
 * implements all thirteen stable ones and none of the experimental ones; the
 * README says why for each.
 *
 * Deliberately absent, and why:
 *
 *   - **Post templates** (`postTemplate`, `postTemplates`, `createPostTemplate`,
 *     `updatePostTemplate`, `deletePostTemplate`). All five carry Buffer's
 *     experimental badge — *"likely to have breaking changes"* — and the
 *     `visibility` enum's `public` member is *"reserved for Buffer-curated
 *     templates; setting it is only available to official Buffer clients"*.
 *   - **`movePostInQueue`.** Experimental, same badge. It is the one omission
 *     that is genuinely useful (reorder a queued post to top or bottom), and it
 *     is the first thing to add when Buffer promotes it.
 *   - **`Post.metadata` as an output.** A twelve-network union whose expansion
 *     runs to hundreds of fields; every consumer wants one network's arm and
 *     there is no generic way to ask for that. It is writable via the
 *     `metadata` param on `post-create` / `post-edit`.
 *   - **Webhooks / triggers.** The schema has no subscription root and Buffer
 *     publishes no webhook surface. There is nothing to poll a trigger against
 *     that `post-list` does not already do.
 *   - **Media upload.** Not an omission: Buffer has no upload endpoint. Assets
 *     are public URLs Buffer fetches, which is why this app needs only one
 *     allowlisted host.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import accountGet from "./actions/account-get.ts";
import organizationList from "./actions/organization-list.ts";

import channelList from "./actions/channel-list.ts";
import channelGet from "./actions/channel-get.ts";
import dailyPostingLimitList from "./actions/daily-posting-limit-list.ts";

import postList from "./actions/post-list.ts";
import postGet from "./actions/post-get.ts";
import postCreate from "./actions/post-create.ts";
import postEdit from "./actions/post-edit.ts";
import postDelete from "./actions/post-delete.ts";
import postMetricsAggregate from "./actions/post-metrics-aggregate.ts";

import ideaList from "./actions/idea-list.ts";
import ideaGroupList from "./actions/idea-group-list.ts";
import ideaCreate from "./actions/idea-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountGet,
    organizationList,
    channelList,
    channelGet,
    dailyPostingLimitList,
    postList,
    postGet,
    postCreate,
    postEdit,
    postDelete,
    postMetricsAggregate,
    ideaList,
    ideaGroupList,
    ideaCreate,
  ],
  auth: [apiKey, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
