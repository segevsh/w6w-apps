import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";
import formCreate from "./actions/form-create.ts";
import formGet from "./actions/form-get.ts";
import listForms from "./actions/list-forms.ts";
import formBatchUpdate from "./actions/form-batch-update.ts";
import formUpdateInfo from "./actions/form-update-info.ts";
import formUpdateSettings from "./actions/form-update-settings.ts";
import formAddItem from "./actions/form-add-item.ts";
import formMoveItem from "./actions/form-move-item.ts";
import formDeleteItem from "./actions/form-delete-item.ts";
import formSetPublishSettings from "./actions/form-set-publish-settings.ts";
import responseList from "./actions/response-list.ts";
import responseGet from "./actions/response-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import newForm from "./triggers/new-form.ts";
import newOrUpdatedForm from "./triggers/new-or-updated-form.ts";
import newResponse from "./triggers/new-response.ts";

export default {
  actions: [
    formCreate,
    formGet,
    listForms,
    formBatchUpdate,
    formUpdateInfo,
    formUpdateSettings,
    formAddItem,
    formMoveItem,
    formDeleteItem,
    formSetPublishSettings,
    responseList,
    responseGet,
  ],
  auth: [oauth2, serviceAccount],
  healthChecks: [service, quota],
  triggers: [newForm, newOrUpdatedForm, newResponse],
} satisfies AppDefinition;
