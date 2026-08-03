import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatTag } from "../lib/client.ts";

/**
 * Every tag defined on the Page.
 *
 * `GET /fb/page/getTags` → `{ status, data: [{ id, name }] }`. There is **no
 * pagination** on this endpoint — no `limit`, no `offset`, no cursor in the spec
 * — so the response is the complete list.
 *
 * This is the lookup that makes `add-subscriber-tag` usable by id. That action
 * also accepts a tag *name*, which is usually the better choice in a workflow;
 * this exists for the cases where a tag has to be resolved once and reused, and
 * for auditing what a Page actually has.
 */
const listTags: ActionDefinition<Record<string, never>> = {
  key: "list-tags",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description:
    "Every tag on the Page (GET /fb/page/getTags), as `{ id, name }`. Unpaginated — the response " +
    "is the whole list.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "array", label: "Tags" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatTag[]>>("/fb/page/getTags");
  },
};

export default listTags;
