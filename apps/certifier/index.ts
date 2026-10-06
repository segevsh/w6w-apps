import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import credentialCreate from "./actions/credential-create.ts";
import credentialCreateIssueSend from "./actions/credential-create-issue-send.ts";
import credentialDelete from "./actions/credential-delete.ts";
import credentialDesignsGet from "./actions/credential-designs-get.ts";
import credentialGet from "./actions/credential-get.ts";
import credentialIssue from "./actions/credential-issue.ts";
import credentialList from "./actions/credential-list.ts";
import credentialSearch from "./actions/credential-search.ts";
import credentialSend from "./actions/credential-send.ts";
import credentialUpdate from "./actions/credential-update.ts";
import designGet from "./actions/design-get.ts";
import designList from "./actions/design-list.ts";
import interactionCreate from "./actions/interaction-create.ts";
import interactionList from "./actions/interaction-list.ts";
import templateCreate from "./actions/template-create.ts";
import templateDelete from "./actions/template-delete.ts";
import templateGet from "./actions/template-get.ts";
import templateList from "./actions/template-list.ts";
import templateUpdate from "./actions/template-update.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";

/**
 * Certifier — digital certificates and badges. Every path, field and enum here
 * was checked on 2026-10-06 against Certifier's OpenAPI document
 * (`developers.certifier.io/api/openapi.json`, `info.version` 2022-10-26) and
 * live probes of `api.certifier.io`.
 */
export default {
  actions: [
    credentialList,
    credentialGet,
    credentialCreate,
    credentialCreateIssueSend,
    credentialIssue,
    credentialSend,
    credentialUpdate,
    credentialDelete,
    credentialSearch,
    credentialDesignsGet,
    interactionList,
    interactionCreate,
    templateList,
    templateGet,
    templateCreate,
    templateUpdate,
    templateDelete,
    designList,
    designGet,
  ],
  auth: [accessToken],
  healthChecks: [service, api],
} satisfies AppDefinition;
