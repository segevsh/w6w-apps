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

/** `GET /api/v1/billing/plans` — List the subscription plans, with pricing when `fields` expands them. */
const listPlans: ActionDefinition<Input> = {
  key: "list-plans",
  type: "search",
  resource: "billing",
  title: "List Plans",
  description: "List the subscription plans, with pricing when `fields` expands them.",
  params: [
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/billing/plans`, {
      method: "GET",
      query: { ...pageQuery(input) },
    });
  },
};

export default listPlans;
