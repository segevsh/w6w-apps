import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import evaluate from "./actions/evaluate.ts";
import listModels from "./actions/list-models.ts";
import service from "./health/service.ts";

export default {
  actions: [listModels, evaluate],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
