/**
 * CleverReach — email marketing: receivers (subscribers), groups (receiver lists), attributes,
 * tags, mailings, reports and the blacklist, over the REST API v3 at `rest.cleverreach.com`.
 *
 * Every path, verb and parameter here comes from the Swagger 2.0 document the vendor publishes at
 * `https://rest.cleverreach.com/v3/explorer/swagger.json`, checked 2026-10-06. Operations the
 * vendor flags deprecated (all of `forms`) are left out; see the README for what is not covered.
 */
import type { AppDefinition } from "@w6w/types";
import whoami from "./actions/whoami.ts";
import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupCreate from "./actions/group-create.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";
import receiverList from "./actions/receiver-list.ts";
import receiverGet from "./actions/receiver-get.ts";
import receiverAdd from "./actions/receiver-add.ts";
import receiverUpdate from "./actions/receiver-update.ts";
import receiverUpsert from "./actions/receiver-upsert.ts";
import receiverDelete from "./actions/receiver-delete.ts";
import receiverSetActive from "./actions/receiver-set-active.ts";
import receiverTagsAdd from "./actions/receiver-tags-add.ts";
import tagList from "./actions/tag-list.ts";
import attributeList from "./actions/attribute-list.ts";
import attributeCreate from "./actions/attribute-create.ts";
import mailingList from "./actions/mailing-list.ts";
import mailingGet from "./actions/mailing-get.ts";
import reportList from "./actions/report-list.ts";
import reportGet from "./actions/report-get.ts";
import blacklistList from "./actions/blacklist-list.ts";
import blacklistAdd from "./actions/blacklist-add.ts";
import blacklistRemove from "./actions/blacklist-remove.ts";
import accessToken from "./auth/access-token.ts";
import clientCredentials from "./auth/client-credentials.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";

const app: AppDefinition = {
  actions: [
    whoami,
    groupList,
    groupGet,
    groupCreate,
    groupUpdate,
    groupDelete,
    receiverList,
    receiverGet,
    receiverAdd,
    receiverUpdate,
    receiverUpsert,
    receiverDelete,
    receiverSetActive,
    receiverTagsAdd,
    tagList,
    attributeList,
    attributeCreate,
    mailingList,
    mailingGet,
    reportList,
    reportGet,
    blacklistList,
    blacklistAdd,
    blacklistRemove,
  ],
  auth: [accessToken, clientCredentials],
  healthChecks: [service, api],
};

export default app;
