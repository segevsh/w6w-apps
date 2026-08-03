import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import formGetMany from "./actions/form-get-many.ts";
import formGet from "./actions/form-get.ts";
import formFieldFiltersGet from "./actions/form-field-filters-get.ts";
import formResultsGet from "./actions/form-results-get.ts";
import formSubmit from "./actions/form-submit.ts";
import formValidate from "./actions/form-validate.ts";
import entryGetMany from "./actions/entry-get-many.ts";
import entryGet from "./actions/entry-get.ts";
import entryCreate from "./actions/entry-create.ts";
import entryUpdate from "./actions/entry-update.ts";
import entryDelete from "./actions/entry-delete.ts";
import entryNotificationsSend from "./actions/entry-notifications-send.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    formGetMany,
    formGet,
    formFieldFiltersGet,
    formResultsGet,
    formSubmit,
    formValidate,
    entryGetMany,
    entryGet,
    entryCreate,
    entryUpdate,
    entryDelete,
    entryNotificationsSend,
  ],
  auth: [basic],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;
