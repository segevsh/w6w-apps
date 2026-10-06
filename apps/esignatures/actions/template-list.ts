import type { ActionDefinition } from "@w6w/types";
import { ESignaturesClient } from "../lib/client.ts";

/** `GET /api/templates` — every template (id and title). The endpoint takes no paging. */
const templateList: ActionDefinition<Record<string, never>> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List the account's templates (ID and title).",
  params: [],
  output: [{ key: "templates", type: "array", label: "Templates: template_id, title" }],

  async execute(_input, ctx) {
    const data = await new ESignaturesClient(ctx).data("/templates");
    return { templates: Array.isArray(data) ? data : [] };
  },
};

export default templateList;
