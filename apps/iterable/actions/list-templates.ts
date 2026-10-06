import type { ActionDefinition } from "@w6w/types";
import { call, int, str } from "../lib/client.ts";

/**
 * `GET /api/templates` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-templates",
  type: "read",
  resource: "template",
  title: "List Templates",
  description:
    "Templates in the project, paginated. Always pass page/pageSize: the unpaginated form is deprecated by Iterable.",
  params: [
    {
      key: "templateType",
      label: "Template Type",
      type: "select",
      options: [{ "value": "Base", "label": "Base" }, { "value": "Blast", "label": "Blast" }, {
        "value": "Triggered",
        "label": "Triggered",
      }, { "value": "Workflow", "label": "Workflow" }],
    },
    {
      key: "messageMedium",
      label: "Message Medium",
      type: "select",
      options: [{ "value": "Email", "label": "Email" }, { "value": "Push", "label": "Push" }, {
        "value": "InApp",
        "label": "InApp",
      }, { "value": "SMS", "label": "SMS" }],
    },
    { key: "startDateTime", label: "Created After", type: "string", hint: "yyyy-MM-dd HH:mm:ss" },
    { key: "endDateTime", label: "Created Before", type: "string", hint: "yyyy-MM-dd HH:mm:ss" },
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      hint: "Results per page (maximum 1000).",
    },
    { key: "sort", label: "Sort", type: "string" },
  ],
  output: [
    { key: "templates", type: "array", label: "Templates" },
    { key: "nextPageUrl", type: "string", label: "Next page URL, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const templateType = str(p.templateType);
    const messageMedium = str(p.messageMedium);
    const startDateTime = str(p.startDateTime);
    const endDateTime = str(p.endDateTime);
    const page = int("page", p.page);
    const pageSize = int("pageSize", p.pageSize);
    const sort = str(p.sort);
    ctx.log("info", "Iterable List Templates");
    const out = await call(ctx, "GET", "/templates", {
      query: {
        "templateType": templateType,
        "messageMedium": messageMedium,
        "startDateTime": startDateTime,
        "endDateTime": endDateTime,
        "page": page,
        "pageSize": pageSize,
        "sort": sort,
      },
    });
    return out;
  },
};

export default action;
