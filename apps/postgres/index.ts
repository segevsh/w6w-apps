import type { AppDefinition } from "@w6w/types";
import postgresAuth from "./auth/postgres.ts";
import query from "./actions/query.ts";
import executeAction from "./actions/execute.ts";
import service from "./health/service.ts";

export default {
  actions: [query, executeAction],
  auth: [postgresAuth],
  healthChecks: [service],
} satisfies AppDefinition;
