import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient } from "../lib/client.ts";

/** `GET /v1/goals` — List the account's revenue goals. */
interface Input {
  per_page?: number;
  page?: number;
}

const goalsList: ActionDefinition<Input> = {
  key: "goals-list",
  type: "search",
  resource: "goal",
  title: "List Goals",
  description: "List the account's revenue goals.",
  params: [
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      hint: "Objects per page. Vendor default 30, maximum 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number; the vendor's pagination meta starts at 0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "goals", type: "array", label: "Goals" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", "/goals", {
      query: { per_page: input.per_page, page: input.page },
    });
  },
};

export default goalsList;
