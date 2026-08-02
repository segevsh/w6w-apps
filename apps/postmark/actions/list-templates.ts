import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

interface Input {
  count?: number;
  offset?: number;
  templateType?: "All" | "Standard" | "Layout" | "";
  layoutTemplate?: string;
}

/**
 * `GET /templates` — list this server's saved templates and layouts.
 * https://postmarkapp.com/developer/api/templates-api#template-list
 */
const listTemplates: ActionDefinition<Input> = {
  key: "list-templates",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List this server's saved templates and layouts.",
  params: [
    { key: "count", label: "Count", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "templateType",
      label: "Template Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "(server default)" },
        { value: "All", label: "All" },
        { value: "Standard", label: "Standard" },
        { value: "Layout", label: "Layout" },
      ],
    },
    {
      key: "layoutTemplate",
      label: "Layout Alias",
      type: "string",
      hint: "Restrict to templates using this layout's alias.",
    },
  ],
  output: [
    { key: "TotalCount", type: "number", label: "Total Count" },
    { key: "Templates", type: "array", label: "Templates" },
  ],

  execute(input, ctx) {
    const qs = new URLSearchParams();
    qs.set("count", String(input.count ?? 100));
    qs.set("offset", String(input.offset ?? 0));
    if (input.templateType) qs.set("templatetype", input.templateType);
    if (input.layoutTemplate) qs.set("layouttemplate", input.layoutTemplate);
    return postmarkFetch(ctx, `/templates?${qs.toString()}`);
  },
};

export default listTemplates;
