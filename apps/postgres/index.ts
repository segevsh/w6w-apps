import type { AppDefinition } from "@w6w/types";
import postgresAuth from "./auth/postgres.ts";
import query from "./actions/query.ts";

export default {
  actions: [query],
  auth: [postgresAuth],
} satisfies AppDefinition;
