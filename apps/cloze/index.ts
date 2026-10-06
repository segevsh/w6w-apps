/**
 * Cloze — the Cloze API (`api.cloze.com`): people, companies, projects, timeline and webhooks.
 *
 * Every path, verb, parameter and body field was read on 2026-10-06 from Cloze's own OpenAPI
 * document (developer.cloze.com/cloze-openapi.json, version 2026.9) and probed unsigned. Findings:
 *
 *  1. **Errors are `{errorcode, message}`** and `errorcode: 0` is success; the client treats a
 *     non-zero code as failure whatever the status (`lib/client.ts`).
 *  2. **Writes return no record**, only `{errorcode, message}`; create/update match an existing
 *     record by ID or e-mail, so they are upserts.
 *  3. **The key goes in a bearer header**, never the `api_key` query parameter the document
 *     also offers, so it cannot land in a URL or log.
 *  4. **Timeline is two calls**: references from `*-timeline`, content from `messages-get`.
 *     The document's timeline body lists `uniqueid` as required but only defines `id`; `id` is
 *     what is sent.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import personFind from "./actions/person-find.ts";
import personFeed from "./actions/person-feed.ts";
import personGet from "./actions/person-get.ts";
import personGetMany from "./actions/person-get-many.ts";
import personCreate from "./actions/person-create.ts";
import personUpdate from "./actions/person-update.ts";
import personDelete from "./actions/person-delete.ts";
import personTimeline from "./actions/person-timeline.ts";
import companyFind from "./actions/company-find.ts";
import companyFeed from "./actions/company-feed.ts";
import companyGet from "./actions/company-get.ts";
import companyGetMany from "./actions/company-get-many.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import companyDelete from "./actions/company-delete.ts";
import companyTimeline from "./actions/company-timeline.ts";
import projectFind from "./actions/project-find.ts";
import projectFeed from "./actions/project-feed.ts";
import projectGet from "./actions/project-get.ts";
import projectGetMany from "./actions/project-get-many.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";
import projectTimeline from "./actions/project-timeline.ts";
import messagesGet from "./actions/messages-get.ts";
import messageBodyGet from "./actions/message-body-get.ts";
import todoCreate from "./actions/todo-create.ts";
import communicationCreate from "./actions/communication-create.ts";
import contentCreate from "./actions/content-create.ts";
import stagesList from "./actions/stages-list.ts";
import segmentsList from "./actions/segments-list.ts";
import customFieldsList from "./actions/custom-fields-list.ts";
import teamMembersList from "./actions/team-members-list.ts";
import teamRolesList from "./actions/team-roles-list.ts";
import teamNodesList from "./actions/team-nodes-list.ts";
import tagsList from "./actions/tags-list.ts";
import stepsList from "./actions/steps-list.ts";
import userProfileGet from "./actions/user-profile-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookSubscribe from "./actions/webhook-subscribe.ts";
import webhookUnsubscribe from "./actions/webhook-unsubscribe.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    personFind,
    personFeed,
    personGet,
    personGetMany,
    personCreate,
    personUpdate,
    personDelete,
    personTimeline,
    companyFind,
    companyFeed,
    companyGet,
    companyGetMany,
    companyCreate,
    companyUpdate,
    companyDelete,
    companyTimeline,
    projectFind,
    projectFeed,
    projectGet,
    projectGetMany,
    projectCreate,
    projectUpdate,
    projectDelete,
    projectTimeline,
    messagesGet,
    messageBodyGet,
    todoCreate,
    communicationCreate,
    contentCreate,
    stagesList,
    segmentsList,
    customFieldsList,
    teamMembersList,
    teamRolesList,
    teamNodesList,
    tagsList,
    stepsList,
    userProfileGet,
    webhookList,
    webhookSubscribe,
    webhookUnsubscribe,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
