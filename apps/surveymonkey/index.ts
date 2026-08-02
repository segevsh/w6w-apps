/**
 * SurveyMonkey — surveys, responses, collectors and contacts via the
 * SurveyMonkey v3 REST API (`api.surveymonkey.com/v3`).
 *
 * Covers the read/write surface of surveys plus the read surface of survey
 * pages and responses, the create surface of collectors (distribution
 * channels), and the read/write surface of the address-book contact lists a
 * collector's email invitations draw from.
 *
 * Deliberately absent: survey/collector/response webhooks (a Trigger, not an
 * Action) and the write side of responses (Create/Modify Responses is a scope
 * that needs SurveyMonkey's approval for a Public app and this pack has no
 * use case yet that needs it).
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import surveyGetMany from "./actions/survey-get-many.ts";
import surveyGet from "./actions/survey-get.ts";
import surveyGetDetails from "./actions/survey-get-details.ts";
import surveyCreate from "./actions/survey-create.ts";
import responseGetMany from "./actions/response-get-many.ts";
import responseGetDetails from "./actions/response-get-details.ts";
import collectorGetMany from "./actions/collector-get-many.ts";
import collectorCreate from "./actions/collector-create.ts";
import pageGetMany from "./actions/page-get-many.ts";
import userGet from "./actions/user-get.ts";
import contactListGetMany from "./actions/contact-list-get-many.ts";
import contactCreate from "./actions/contact-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // survey
    surveyGetMany,
    surveyGet,
    surveyGetDetails,
    surveyCreate,
    // response
    responseGetMany,
    responseGetDetails,
    // collector
    collectorGetMany,
    collectorCreate,
    // page
    pageGetMany,
    // user
    userGet,
    // contact
    contactListGetMany,
    contactCreate,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
