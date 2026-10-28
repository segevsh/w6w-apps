import type { AppDefinition } from "@w6w/types";
import accountGet from "./actions/account-get.ts";
import configurationSetList from "./actions/configuration-set-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactListList from "./actions/contact-list-list.ts";
import contactSearch from "./actions/contact-search.ts";
import identityCreate from "./actions/identity-create.ts";
import identityDelete from "./actions/identity-delete.ts";
import identityGet from "./actions/identity-get.ts";
import identityList from "./actions/identity-list.ts";
import sendBulkEmail from "./actions/send-bulk-email.ts";
import sendEmail from "./actions/send-email.ts";
import sendTemplatedEmail from "./actions/send-templated-email.ts";
import suppressionDelete from "./actions/suppression-delete.ts";
import suppressionGet from "./actions/suppression-get.ts";
import suppressionList from "./actions/suppression-list.ts";
import suppressionPut from "./actions/suppression-put.ts";
import templateCreate from "./actions/template-create.ts";
import templateDelete from "./actions/template-delete.ts";
import templateGet from "./actions/template-get.ts";
import templateList from "./actions/template-list.ts";
import templateUpdate from "./actions/template-update.ts";
import awsIam from "./auth/aws-iam.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountGet,
    configurationSetList,
    contactCreate,
    contactDelete,
    contactGet,
    contactListList,
    contactSearch,
    identityCreate,
    identityDelete,
    identityGet,
    identityList,
    sendBulkEmail,
    sendEmail,
    sendTemplatedEmail,
    suppressionDelete,
    suppressionGet,
    suppressionList,
    suppressionPut,
    templateCreate,
    templateDelete,
    templateGet,
    templateList,
    templateUpdate,
  ],
  auth: [awsIam],
  healthChecks: [service, quota],
} satisfies AppDefinition;
