import type { ActionDefinition } from "@w6w/types";
import { HctiClient } from "../lib/client.ts";

/**
 * `GET /v1/template` — list templates (one entry per template, its newest version).
 *
 * Needs `templates:read`. Answers `{data: [...], pagination: {next_page_start}}`. Each entry
 * is `html_css` or `blocks` (`template_type`) and carries `id`, `version`, `name`,
 * `render_count` and the saved render settings. To page, pass the previous
 * `pagination.next_page_start` as `max_version`; it is `null` on the last page. `count`
 * defaults to 10.
 */
interface Input {
  count?: number;
  max_version?: number | string;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List saved templates with their latest version.",
  params: [
    { key: "count", label: "Page size", type: "number", hint: "Default 10." },
    {
      key: "max_version",
      label: "Page start (max version)",
      type: "number",
      hint: "`pagination.next_page_start` from the previous page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Templates" },
    { key: "pagination", type: "object", label: "{next_page_start}, null on the last page" },
  ],

  execute(input, ctx) {
    return new HctiClient(ctx).json("/template", {
      query: { count: input.count, max_version: input.max_version },
    });
  },
};

export default templateList;
