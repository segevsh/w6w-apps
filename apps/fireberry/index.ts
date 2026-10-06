import type { AppDefinition } from "@w6w/types";
import token from "./auth/token.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import recordList from "./actions/record-list.ts";
import recordGet from "./actions/record-get.ts";
import recordCreate from "./actions/record-create.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";
import recordListRelated from "./actions/record-list-related.ts";
import recordsBatchCreate from "./actions/records-batch-create.ts";
import recordsBatchUpdate from "./actions/records-batch-update.ts";
import queryRecords from "./actions/query-records.ts";
import objectList from "./actions/object-list.ts";
import objectGet from "./actions/object-get.ts";
import fieldList from "./actions/field-list.ts";
import fieldGet from "./actions/field-get.ts";
import picklistValues from "./actions/picklist-values.ts";

/**
 * Fireberry (formerly Powerlink) CRM. Record CRUD is generic over the object
 * (`/api/record/{object}` takes a system name or an object number, custom
 * objects included), plus the v3 query endpoint, batch create/update and the
 * metadata API. Built from the OpenAPI blocks embedded in
 * developers.fireberry.com/reference. Typed per-object field schemas, custom
 * object/field management, files and the legacy query are not covered.
 */
export default {
  actions: [
    // Records
    recordList,
    recordGet,
    recordCreate,
    recordUpdate,
    recordDelete,
    recordListRelated,
    recordsBatchCreate,
    recordsBatchUpdate,
    queryRecords,
    // Metadata
    objectList,
    objectGet,
    fieldList,
    fieldGet,
    picklistValues,
  ],
  auth: [token],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
