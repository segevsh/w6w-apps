import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import entryList from "./actions/entry-list.ts";
import entryGet from "./actions/entry-get.ts";
import entryCreate from "./actions/entry-create.ts";
import entryUpdate from "./actions/entry-update.ts";
import entryDelete from "./actions/entry-delete.ts";
import mediaList from "./actions/media-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import site from "./health/site.ts";

export default {
  actions: [
    entryList,
    entryGet,
    entryCreate,
    entryUpdate,
    entryDelete,
    mediaList,
  ],
  auth: [apiToken],
  healthChecks: [service, quota, site],
} satisfies AppDefinition;
