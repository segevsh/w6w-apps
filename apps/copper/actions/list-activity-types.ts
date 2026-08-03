import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /activity_types` — the account's Activity Types.
 *
 * The lookup Create Activity and Search Activities both depend on, because
 * Copper numbers activity types **per account** with only three exceptions, all
 * hard-coded: Notes is `user`/`0`, "Property Changed" is `system`/`1`, and
 * "Pipeline Stage Changed" is `system`/`3`. Phone Calls, Meetings and every
 * custom type get their ids when the account is created or the type is added.
 *
 * The response is not a flat array. Copper keys it by category:
 * `{"user": [...], "system": [...]}` — which is the whole point, since an id is
 * only meaningful paired with its category. That shape is passed through
 * unchanged rather than flattened, so the pairing survives.
 *
 * Types removed from the Settings page still appear here and can still be
 * filtered on, but cannot be used to create new Activities — Copper keeps them
 * "because they are necessary to correctly handle Activities of those types".
 */
const listActivityTypes: ActionDefinition<Input> = {
  key: "list-activity-types",
  type: "search",
  resource: "activity",
  title: "List Activity Types",
  description:
    "List the account's Activity Types, keyed by category (`user` / `system`). Needed to create " +
    "anything other than a Note, whose id is hard-coded to 0.",
  params: [],
  output: [
    { key: "user", type: "array", label: "User-entered types (creatable)" },
    { key: "system", type: "array", label: "System types (read-only)" },
  ],

  execute(_input, ctx) {
    return new CopperClient(ctx).request("/activity_types");
  },
};

export default listActivityTypes;
