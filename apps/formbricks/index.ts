import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import meGet from "./actions/me-get.ts";
import surveyList from "./actions/survey-list.ts";
import surveyGet from "./actions/survey-get.ts";
import surveyCreate from "./actions/survey-create.ts";
import surveyUpdate from "./actions/survey-update.ts";
import surveyDelete from "./actions/survey-delete.ts";
import surveySingleUseLinks from "./actions/survey-single-use-links.ts";
import responseList from "./actions/response-list.ts";
import responseGet from "./actions/response-get.ts";
import responseCreate from "./actions/response-create.ts";
import responseUpdate from "./actions/response-update.ts";
import responseDelete from "./actions/response-delete.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactAttributeList from "./actions/contact-attribute-list.ts";
import contactAttributeKeyList from "./actions/contact-attribute-key-list.ts";
import contactAttributeKeyGet from "./actions/contact-attribute-key-get.ts";
import actionClassList from "./actions/action-class-list.ts";
import actionClassGet from "./actions/action-class-get.ts";
import actionClassCreate from "./actions/action-class-create.ts";
import actionClassDelete from "./actions/action-class-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Formbricks Cloud — open-source survey / experience-management platform. Built on the
 * v1 Management API (the only documented, complete surface; v2 is a Beta stub). The
 * unauthenticated Public Client API (SDK endpoints) and file storage are not covered.
 */
export default {
  actions: [
    // me
    meGet,
    // survey
    surveyList,
    surveyGet,
    surveyCreate,
    surveyUpdate,
    surveyDelete,
    surveySingleUseLinks,
    // response
    responseList,
    responseGet,
    responseCreate,
    responseUpdate,
    responseDelete,
    // contact
    contactList,
    contactGet,
    // contact-attribute
    contactAttributeList,
    // contact-attribute-key
    contactAttributeKeyList,
    contactAttributeKeyGet,
    // action-class
    actionClassList,
    actionClassGet,
    actionClassCreate,
    actionClassDelete,
    // webhook
    webhookList,
    webhookGet,
    webhookCreate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
