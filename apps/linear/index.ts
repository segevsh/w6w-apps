/**
 * Linear — w6w port of n8n's `Linear` node.
 *
 * Linear has no REST API: everything is a GraphQL POST to a single endpoint,
 * so `lib/client.ts` is a GraphQL client rather than a REST wrapper, and each
 * action owns its query/mutation document. Two consequences worth knowing:
 *
 *   - **GraphQL answers 200 on failure.** Problems come back in `errors[]`
 *     with an HTTP 200, so the client checks both — otherwise a failed mutation
 *     would read as a success with an undefined result.
 *   - **Ids are UUIDs, not the keys you see in the UI.** `ENG-42` is an issue's
 *     *identifier*; `teamId`, `stateId`, `labelIds` and `assigneeId` all want
 *     UUIDs. The `*-get-many` actions exist to look those up.
 *
 * Deliberately absent: the webhook trigger (a Trigger, not an Action — which is
 * also why n8n's `signingSecret` credential field is not collected).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueUpdate from "./actions/issue-update.ts";
import issueDelete from "./actions/issue-delete.ts";
import issueGetMany from "./actions/issue-get-many.ts";
import commentCreate from "./actions/comment-create.ts";
import projectCreate from "./actions/project-create.ts";
import teamGetMany from "./actions/team-get-many.ts";
import stateGetMany from "./actions/state-get-many.ts";
import userGetMany from "./actions/user-get-many.ts";
import labelGetMany from "./actions/label-get-many.ts";

export default {
  actions: [
    // issue
    issueCreate,
    issueGet,
    issueUpdate,
    issueDelete,
    issueGetMany,
    // comment
    commentCreate,
    // project
    projectCreate,
    // lookups — the UUID sources the write actions need
    teamGetMany,
    stateGetMany,
    userGetMany,
    labelGetMany,
  ],
  auth: [apiKey, oauth2],
} satisfies AppDefinition;
