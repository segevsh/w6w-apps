import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

interface Input {
  projectId?: number;
  crawlDate?: string;
  projectName?: string;
  projectUrl?: string;
}

/** `GET /site-audit/projects` — response key `healthscores`. */
const siteAuditProjectList: ActionDefinition<Input> = {
  key: "site-audit-project-list",
  type: "read",
  resource: "audit",
  title: "List Site Audit Health Scores",
  description: "Health scores of Site Audit projects, optionally filtered by id, name or URL.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "number",
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
      key: "projectName",
      label: "Project name",
      type: "string",
      hint: "Only projects with this name.",
    },
    {
      key: "projectUrl",
      label: "Project URL",
      type: "string",
      hint: "Only projects with this target URL.",
    },
  ],
  output: [
    { key: "healthscores", type: "array", label: "Health scores" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(input, ctx) {
    return new AhrefsClient(ctx).report("/site-audit/projects", {
      project_id: input.projectId,
      date: input.crawlDate,
      project_name: input.projectName,
      project_url: input.projectUrl,
    });
  },
};

export default siteAuditProjectList;
