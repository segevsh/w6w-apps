import type { AppDefinition } from "@w6w/types";
import candidateConversationList from "./actions/candidate-conversation-list.ts";
import candidateCreate from "./actions/candidate-create.ts";
import candidateFindByEmail from "./actions/candidate-find-by-email.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateList from "./actions/candidate-list.ts";
import candidateMessageSend from "./actions/candidate-message-send.ts";
import candidateMove from "./actions/candidate-move.ts";
import candidateNoteAdd from "./actions/candidate-note-add.ts";
import candidateScorecardAdd from "./actions/candidate-scorecard-add.ts";
import candidateSearch from "./actions/candidate-search.ts";
import candidateSetStage from "./actions/candidate-set-stage.ts";
import candidateStreamList from "./actions/candidate-stream-list.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import categoryList from "./actions/category-list.ts";
import companyGet from "./actions/company-get.ts";
import companyList from "./actions/company-list.ts";
import customFieldList from "./actions/custom-field-list.ts";
import departmentList from "./actions/department-list.ts";
import pipelineGet from "./actions/pipeline-get.ts";
import pipelineList from "./actions/pipeline-list.ts";
import positionCreate from "./actions/position-create.ts";
import positionGet from "./actions/position-get.ts";
import positionList from "./actions/position-list.ts";
import positionSetState from "./actions/position-set-state.ts";
import positionUpdate from "./actions/position-update.ts";
import userGet from "./actions/user-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookPause from "./actions/webhook-pause.ts";
import webhookResume from "./actions/webhook-resume.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import accessToken from "./auth/access-token.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * Breezy HR — applicant tracking: companies, positions, candidates, pipelines, webhooks.
 * Findings that shaped this app (2026-10-06):
 *
 * - A missing or invalid token answers HTTP 400 (`invalidAccessToken` / `missingAccessToken`),
 *   not 401, so the credential check reads `error.type`.
 * - Everything is scoped by a company `_id` (and a position `_id` for candidates), and a
 *   candidate is addressed only through its position.
 * - Bodies are bare resources; several writes answer 204 with no body.
 */
const app: AppDefinition = {
  actions: [
    candidateConversationList,
    candidateCreate,
    candidateFindByEmail,
    candidateGet,
    candidateList,
    candidateMessageSend,
    candidateMove,
    candidateNoteAdd,
    candidateScorecardAdd,
    candidateSearch,
    candidateSetStage,
    candidateStreamList,
    candidateUpdate,
    categoryList,
    companyGet,
    companyList,
    customFieldList,
    departmentList,
    pipelineGet,
    pipelineList,
    positionCreate,
    positionGet,
    positionList,
    positionSetState,
    positionUpdate,
    userGet,
    webhookCreate,
    webhookDelete,
    webhookList,
    webhookPause,
    webhookResume,
    webhookUpdate,
  ],
  auth: [accessToken],
  healthChecks: [service, api, quota],
};

export default app;
