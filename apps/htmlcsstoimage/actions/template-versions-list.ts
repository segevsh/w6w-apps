import type { ActionDefinition } from "@w6w/types";
import { encodeId, HctiClient } from "../lib/client.ts";

/**
 * `GET /v1/template/{id}` — list the saved versions of ONE template, newest first.
 *
 * This is the only way to read a single template: the route is named "get" by shape but
 * the OpenAPI operation is `list-template-versions` and it answers the same
 * `{data, pagination}` list as `template-list`, filtered to this template. Needs
 * `templates:read`. Page with `max_version` exactly as in `template-list`.
 */
interface Input {
  template_id: string;
  count?: number;
  max_version?: number | string;
}

const templateVersionsList: ActionDefinition<Input> = {
  key: "template-versions-list",
  type: "read",
  resource: "template",
  title: "List Template Versions",
  description: "List the saved versions of a template (the way to read one template's HTML/CSS).",
  params: [
    { key: "template_id", label: "Template ID", type: "string", required: true },
    { key: "count", label: "Page size", type: "number", hint: "Default 10." },
    {
      key: "max_version",
      label: "Page start (max version)",
      type: "number",
      hint: "`pagination.next_page_start` from the previous page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Versions" },
    { key: "pagination", type: "object", label: "{next_page_start}, null on the last page" },
  ],

  execute(input, ctx) {
    if (!input.template_id) throw new Error("template_id is required");
    return new HctiClient(ctx).json(`/template/${encodeId(input.template_id)}`, {
      query: { count: input.count, max_version: input.max_version },
    });
  },
};

export default templateVersionsList;
