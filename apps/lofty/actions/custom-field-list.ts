import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/teamFeatures/listCustomField` — the team's lead custom fields.
 *
 * Answers a bare array of definitions: `attributeName`, `attributeType`
 * (`number`, `text`, `date`, `anniversary_date`, `single_select`,
 * `multi_select`, `percentage`, `currency`), a `value` and, for the select
 * types, a `params` string carrying the options.
 *
 * This is the team's own schema, so it is the only reliable source for what
 * `attributeName` values a workflow may write. Note that `value` and `params`
 * are both **strings** — a multi-select's value is itself a stringified JSON
 * array (`"[\"item1\",\"item2\"]"`), so it needs a second parse after this
 * call.
 */
const action: ActionDefinition = {
  key: "custom-field-list",
  type: "read",
  resource: "team-feature",
  title: "List Custom Fields",
  description:
    "List the lead-level custom field definitions configured on the team (GET /v1.0/teamFeatures/listCustomField).",
  params: [],
  output: [{ key: "", type: "array", label: "Custom field definitions" }],

  execute(_input, ctx) {
    return new LoftyClient(ctx).request("/teamFeatures/listCustomField");
  },
};

export default action;
