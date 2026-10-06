import type { ActionDefinition } from "@w6w/types";
import { EverhourClient } from "../lib/client.ts";

/**
 * `GET /resource-planner/time-off-types` — List time-off types.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const timeOffTypeList: ActionDefinition<Input> = {
  key: "time-off-type-list",
  type: "search",
  resource: "time-off-type",
  title: "List Time-Off Types",
  description: "List time-off types.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records in this response" },
    {
      key: "nextPage",
      type: "number",
      label: "Next page number, or null when there is no further page",
    },
  ],

  execute(_input, ctx) {
    return new EverhourClient(ctx).many(`/resource-planner/time-off-types`);
  },
};

export default timeOffTypeList;
