/**
 * Sierra Interactive — leads, notes, tasks, saved listings, listing requests and action plans
 * over the API at `api.sierrainteractivedev.com`.
 *
 * Every path, verb, parameter and body field was read from the vendor's Swagger 2.0 document
 * (`/swagger/docs/v1`, fetched 2026-10-06), which describes the `/zapier/*` controller, and the
 * routes were spot-checked against the live host (a real route answers 400 "Unauthorized
 * request" without a key; an unknown one a JSON 404). Not covered yet: see README.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadFind from "./actions/lead-find.ts";
import leadNoteAdd from "./actions/lead-note-add.ts";
import leadTaskCreate from "./actions/lead-task-create.ts";
import savedListingCreate from "./actions/saved-listing-create.ts";
import requestInfo from "./actions/request-info.ts";
import scheduleShowing from "./actions/schedule-showing.ts";
import actionPlanApplyTraditional from "./actions/action-plan-apply-traditional.ts";
import actionPlanApplyAutomated from "./actions/action-plan-apply-automated.ts";
import actionPlanStopTraditional from "./actions/action-plan-stop-traditional.ts";
import actionPlanStopAutomated from "./actions/action-plan-stop-automated.ts";

import listAgents from "./actions/list-agents.ts";
import listSites from "./actions/list-sites.ts";
import listLeadSources from "./actions/list-lead-sources.ts";
import listLeadStatuses from "./actions/list-lead-statuses.ts";
import listEmailStatuses from "./actions/list-email-statuses.ts";
import listPhoneStatuses from "./actions/list-phone-statuses.ts";
import listTaskTypes from "./actions/list-task-types.ts";
import listMlsRegions from "./actions/list-mls-regions.ts";
import listLeadTypes from "./actions/list-lead-types.ts";
import listTags from "./actions/list-tags.ts";
import listSiteLeadSources from "./actions/list-site-lead-sources.ts";
import listTraditionalActionPlans from "./actions/list-traditional-action-plans.ts";
import listFullyAutomatedActionPlans from "./actions/list-fully-automated-action-plans.ts";
import listStartNextDayValues from "./actions/list-start-next-day-values.ts";
import listFullyAutoStopStatuses from "./actions/list-fully-auto-stop-statuses.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    leadCreate,
    leadUpdate,
    leadFind,
    leadNoteAdd,
    leadTaskCreate,
    savedListingCreate,
    requestInfo,
    scheduleShowing,
    actionPlanApplyTraditional,
    actionPlanApplyAutomated,
    actionPlanStopTraditional,
    actionPlanStopAutomated,
    listAgents,
    listSites,
    listLeadSources,
    listLeadStatuses,
    listEmailStatuses,
    listPhoneStatuses,
    listTaskTypes,
    listMlsRegions,
    listLeadTypes,
    listTags,
    listSiteLeadSources,
    listTraditionalActionPlans,
    listFullyAutomatedActionPlans,
    listStartNextDayValues,
    listFullyAutoStopStatuses,
  ],
  // API key only: Sierra documents no OAuth surface.
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
