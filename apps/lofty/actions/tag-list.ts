import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/teamFeatures/listTag` — the lead tags this caller can use.
 *
 * Answers a bare array. Each row has `tagId`, `tagName` and `visibleType`, and
 * the list covers both team-wide tags and tags scoped to the caller.
 *
 * Worth calling before tagging a lead: `tagsAdd` on a lead takes tag *names*,
 * so this is where the exact spelling comes from — a tag name that differs by
 * case or spacing creates a new tag rather than applying the existing one.
 */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "team-feature",
  title: "List Lead Tags",
  description: "List the lead tags available to this caller (GET /v1.0/teamFeatures/listTag).",
  params: [],
  output: [{ key: "", type: "array", label: "Lead tags" }],

  execute(_input, ctx) {
    return new LoftyClient(ctx).request("/teamFeatures/listTag");
  },
};

export default action;
