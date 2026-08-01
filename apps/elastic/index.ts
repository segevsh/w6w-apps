import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import basic from "./auth/basic.ts";
import search from "./actions/search.ts";
import documentIndex from "./actions/document-index.ts";
import documentGet from "./actions/document-get.ts";
import documentUpdate from "./actions/document-update.ts";
import documentDelete from "./actions/document-delete.ts";
import indexCreate from "./actions/index-create.ts";
import indexDelete from "./actions/index-delete.ts";
import indexList from "./actions/index-list.ts";
import indexMappingGet from "./actions/index-mapping-get.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    search,
    documentIndex,
    documentGet,
    documentUpdate,
    documentDelete,
    indexCreate,
    indexDelete,
    indexList,
    indexMappingGet,
  ],
  auth: [apiKey, basic],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;
