import type { AppDefinition } from "@w6w/types";
import postgresAuth from "./auth/postgres.ts";
import query from "./actions/query.ts";
import executeAction from "./actions/execute.ts";
import service from "./health/service.ts";
import newRow from "./triggers/new-row.ts";

export default {
  actions: [query, executeAction],
  auth: [postgresAuth],
  triggers: [newRow],
  healthChecks: [service],
} satisfies AppDefinition;
