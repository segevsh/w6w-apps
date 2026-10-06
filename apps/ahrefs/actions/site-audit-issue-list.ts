import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  projectId: number;
  crawlDate?: string;
  dateCompared?: string;
}

/** `GET /site-audit/issues` — response key `issues`. */
const siteAuditIssueList: ActionDefinition<Input> = {
  key: "site-audit-issue-list",
  type: "read",
  resource: "audit",
  title: "List Site Audit Issues",
  description:
    "The issues found by a Site Audit crawl, with counts and change since a comparison crawl.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
      required: true,
      hint: "The numeric project id (from the project's URL or List Projects).",
      validation: { min: 1, integer: true },
    },
    {
      key: "crawlDate",
      label: "Crawl date",
      type: "string",
      hint: "Crawl timestamp `YYYY-MM-DDThh:mm:ss`. Omit for the latest crawl.",
    },
    {
      key: "dateCompared",
      label: "Compare date",
      type: "string",
      hint: "Optional `YYYY-MM-DD` to compare metrics against.",
    },
  ],
  output: [
    { key: "issues", type: "array", label: "Issues" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-audit/issues", {
      project_id: input.projectId,
      date: input.crawlDate,
      date_compared: input.dateCompared,
    });
  },
};

export default siteAuditIssueList;
