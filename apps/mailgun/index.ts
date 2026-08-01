import type { AppDefinition } from "@w6w/types";
import messageSend from "./actions/message-send.ts";
import domainGet from "./actions/domain-get.ts";
import domainGetMany from "./actions/domain-get-many.ts";
import emailValidate from "./actions/email-validate.ts";
import eventGetMany from "./actions/event-get-many.ts";
import statsGet from "./actions/stats-get.ts";
import listMemberAdd from "./actions/list-member-add.ts";
import listMemberDelete from "./actions/list-member-delete.ts";
import bounceGetMany from "./actions/bounce-get-many.ts";
import bounceDelete from "./actions/bounce-delete.ts";
import complaintGetMany from "./actions/complaint-get-many.ts";
import complaintDelete from "./actions/complaint-delete.ts";
import unsubscribeGetMany from "./actions/unsubscribe-get-many.ts";
import unsubscribeDelete from "./actions/unsubscribe-delete.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    messageSend,
    domainGet,
    domainGetMany,
    emailValidate,
    eventGetMany,
    statsGet,
    listMemberAdd,
    listMemberDelete,
    bounceGetMany,
    bounceDelete,
    complaintGetMany,
    complaintDelete,
    unsubscribeGetMany,
    unsubscribeDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
