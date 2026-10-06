/**
 * Recruit CRM — recruitment CRM and ATS, over the REST API at `api.recruitcrm.io/v1`.
 *
 * Every path, verb, parameter and body field was read off the vendor's OpenAPI document
 * (`https://api.recruitcrm.io/docs`), and the unsigned error shapes were probed live on
 * 2026-10-06.
 *
 * Findings that shape the code:
 *
 *  1. **Edits are `POST /{entity}/{id}`**; candidate create/edit are multipart/form-data and
 *     every other write is JSON (`lib/client.ts`).
 *  2. **Lists are Laravel paginators**, folded into `{items, count, currentPage, perPage,
 *     hasMore}`.
 *  3. **Error bodies come in three shapes** (`error`, `message`, `errorMessage`), so credential
 *     checks are classified from the body.
 *  4. **The probe is `GET /v1/users`**; its response carries no credential.
 *  5. **The status page is Statuspage-compatible but names only regions**, so the page-level
 *     indicator is used and declared informational.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import candidateAssign from "./actions/candidate-assign.ts";
import candidateCreate from "./actions/candidate-create.ts";
import candidateDelete from "./actions/candidate-delete.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateHiringStageUpdate from "./actions/candidate-hiring-stage-update.ts";
import candidateList from "./actions/candidate-list.ts";
import candidateSearch from "./actions/candidate-search.ts";
import candidateUnassign from "./actions/candidate-unassign.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import companyCreate from "./actions/company-create.ts";
import companyGet from "./actions/company-get.ts";
import companyList from "./actions/company-list.ts";
import companySearch from "./actions/company-search.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactSearch from "./actions/contact-search.ts";
import hiringPipelineList from "./actions/hiring-pipeline-list.ts";
import jobAssignedCandidates from "./actions/job-assigned-candidates.ts";
import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobSearch from "./actions/job-search.ts";
import noteCreate from "./actions/note-create.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    candidateAssign,
    candidateCreate,
    candidateDelete,
    candidateGet,
    candidateHiringStageUpdate,
    candidateList,
    candidateSearch,
    candidateUnassign,
    candidateUpdate,
    companyCreate,
    companyGet,
    companyList,
    companySearch,
    contactCreate,
    contactGet,
    contactList,
    contactSearch,
    hiringPipelineList,
    jobAssignedCandidates,
    jobGet,
    jobList,
    jobSearch,
    noteCreate,
    userList,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
