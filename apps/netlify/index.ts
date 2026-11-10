import type { AppDefinition } from "@w6w/types";
import siteList from "./actions/site-list.ts";
import siteGet from "./actions/site-get.ts";
import deployCreate from "./actions/deploy-create.ts";
import deployList from "./actions/deploy-list.ts";
import deployGet from "./actions/deploy-get.ts";
import deployCancel from "./actions/deploy-cancel.ts";
import envVarList from "./actions/env-var-list.ts";
import envVarSet from "./actions/env-var-set.ts";
import formList from "./actions/form-list.ts";
import formSubmissionList from "./actions/form-submission-list.ts";
import personalAccessToken from "./auth/personal-access-token.ts";
import deploy from "./triggers/deploy.ts";
import deploySucceeded from "./triggers/deploy-succeeded.ts";
import deployFailed from "./triggers/deploy-failed.ts";
import deployStarted from "./triggers/deploy-started.ts";
import submissionCreated from "./triggers/submission-created.ts";
import newSite from "./triggers/new-site.ts";
import newForm from "./triggers/new-form.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    siteList,
    siteGet,
    deployCreate,
    deployList,
    deployGet,
    deployCancel,
    envVarList,
    envVarSet,
    formList,
    formSubmissionList,
  ],
  triggers: [
    deploy,
    deploySucceeded,
    deployFailed,
    deployStarted,
    submissionCreated,
    newSite,
    newForm,
  ],
  auth: [personalAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
