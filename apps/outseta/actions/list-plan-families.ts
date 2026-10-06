import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
}

/** `GET /api/v1/billing/planfamilies` — List plan families (the groupings plans belong to). */
const listPlanFamilies: ActionDefinition<Input> = {
  key: "list-plan-families",
  type: "search",
  resource: "billing",
  title: "List Plan Families",
  description: "List plan families (the groupings plans belong to).",
  params: [
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/billing/planfamilies`, {
      method: "GET",
      query: { ...pageQuery(input) },
    });
  },
};

export default listPlanFamilies;
