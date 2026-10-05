import type { ActionDefinition } from "@w6w/types";
import { listResult, MightyClient } from "../lib/client.ts";

/** `GET /plans` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  page?: number;
  perPage?: number;
}

const planList: ActionDefinition<Input> = {
  key: "plan-list",
  type: "search",
  resource: "plan",
  title: "List Plans",
  description: "List the Network's plans, one page at a time.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Defaults to 1.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "Items per page, max 100.",
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label:
        "The page of records, when the response carries them as an array under `items`/`data` (null otherwise)",
    },
    { key: "result", type: "object", label: "The full response body, unmodified" },
  ],

  async execute(input, ctx) {
    return listResult(
      await new MightyClient(ctx).request("/plans", {
        query: { page: input.page, per_page: input.perPage },
      }),
    );
  },
};

export default planList;
