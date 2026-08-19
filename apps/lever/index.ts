/**
 * Lever — read and move candidates through the hiring pipeline, manage
 * postings, notes and archive state.
 *
 * Three facts shape this app. A plain `GET /opportunities` **omits
 * confidential records by default**, so every listing action here takes an
 * explicit confidentiality and defaults to `all`. A **contact** is a person
 * and an **opportunity** is one application, so deduplicating by opportunity
 * counts people twice. And every write is attributed to a Lever user through
 * `perform_as`, which `user-list` supplies — without it, automated notes and
 * stage moves appear under whoever created the API key. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import opportunityList from "./actions/opportunity-list.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityStageSet from "./actions/opportunity-stage-set.ts";
import opportunityArchive from "./actions/opportunity-archive.ts";
import noteList from "./actions/note-list.ts";
import noteAdd from "./actions/note-add.ts";
import offerList from "./actions/offer-list.ts";
import postingList from "./actions/posting-list.ts";
import stageList from "./actions/stage-list.ts";
import archiveReasonList from "./actions/archive-reason-list.ts";
import userList from "./actions/user-list.ts";

const app: AppDefinition = {
  actions: [
    opportunityList,
    opportunityGet,
    opportunityCreate,
    opportunityStageSet,
    opportunityArchive,
    noteList,
    noteAdd,
    offerList,
    postingList,
    stageList,
    archiveReasonList,
    userList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
};

export default app;
