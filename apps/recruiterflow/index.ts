/**
 * Recruiterflow — applicant tracking and recruiting CRM: candidates, jobs, clients, contacts,
 * deals and users over the external API (`api.recruiterflow.com/api/external`).
 *
 * Every path, verb and field was verified on 2026-10-06 against Recruiterflow's own OpenAPI
 * document (`recruiterflow.com/swagger.yml`, 128 paths) plus live probes. The deprecated
 * `/status/list` endpoint is not used. See README.md for coverage and caveats.
 */
import type { AppDefinition } from "@w6w/types";
import candidateList from "./actions/candidate-list.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateSearch from "./actions/candidate-search.ts";
import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobCount from "./actions/job-count.ts";
import jobSearch from "./actions/job-search.ts";
import jobStageNames from "./actions/job-stage-names.ts";
import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import dealList from "./actions/deal-list.ts";
import tagsList from "./actions/tags-list.ts";
import candidateAdd from "./actions/candidate-add.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import candidateAddToJob from "./actions/candidate-add-to-job.ts";
import candidateMoveToStage from "./actions/candidate-move-to-stage.ts";
import candidateDisqualify from "./actions/candidate-disqualify.ts";
import candidateNoteAdd from "./actions/candidate-note-add.ts";
import contactAdd from "./actions/contact-add.ts";
import clientAdd from "./actions/client-add.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import service from "./health/service.ts";

export default {
  actions: [
    candidateList,
    candidateGet,
    candidateSearch,
    jobList,
    jobGet,
    jobCount,
    jobSearch,
    jobStageNames,
    clientList,
    clientGet,
    contactList,
    contactGet,
    userList,
    userGet,
    dealList,
    tagsList,
    candidateAdd,
    candidateUpdate,
    candidateAddToJob,
    candidateMoveToStage,
    candidateDisqualify,
    candidateNoteAdd,
    contactAdd,
    clientAdd,
  ],
  auth: [apiKey],
  healthChecks: [service, api],
} satisfies AppDefinition;
