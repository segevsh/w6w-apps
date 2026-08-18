import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /company/tags` — verified against Front's own OpenAPI document
 * (`list-company-tags`).
 *
 * Tagging is done by **id**, and a workflow usually knows a tag by its name, so
 * this is the map between them. It reads the **company** tags deliberately:
 * Front also has per-teammate and per-team tags, and a workflow that tags on
 * behalf of the company should not be reaching into one person's private
 * labels.
 *
 * Tags nest — a tag has `children` — so a name is only unique within its
 * parent. When two tags share a name, the `highlight` colour and the parent are
 * what tell them apart.
 */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List tags",
  description:
    "The company's tags, mapping names to the ids Add/Remove Tags need. Company tags only — " +
    "not one teammate's private labels.",
  params: [...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "highlight", type: "string", label: "Colour" },
    { key: "is_private", type: "boolean", label: "Private" },
    { key: "is_visible_in_conversation_lists", type: "boolean", label: "Shown in lists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new FrontClient(ctx).requestAll("/company/tags", {}, returnAll ? Infinity : limit);
  },
};

export default action;
