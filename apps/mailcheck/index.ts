import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import checkEmail from "./actions/check-email.ts";
import batchCheckCreate from "./actions/batch-check-create.ts";
import batchOperationGet from "./actions/batch-operation-get.ts";
import batchOperationList from "./actions/batch-operation-list.ts";
import service from "./health/service.ts";

export default {
  actions: [
    checkEmail,
    batchCheckCreate,
    batchOperationGet,
    batchOperationList,
  ],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
