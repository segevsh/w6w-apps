import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/projects/{org}/{project}/events/` — verified against Sentry's
 * OpenAPI schema (`listProjectEvents`; scopes `project:read`).
 *
 * Project-scoped rather than organization-scoped: this is the raw event stream
 * for one project. For events belonging to one issue, use `issue-event-list`.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List a project's events",
  description: "List the raw error events a project has received.",
  params: [
    ORG_PARAM,
    PROJECT_PARAM,
    ...LIST_PARAMS,
    {
      key: "full",
      label: "Full Event Bodies",
      type: "boolean",
      default: false,
      hint: "Include the stacktrace and the rest of the event payload.",
    },
    {
      key: "statsPeriod",
      label: "Stats Period",
      type: "string",
      default: "",
      placeholder: "24h",
      hint: "A number followed by h or d. Overrides Start/End.",
    },
    { key: "start", label: "Start", type: "datetime", default: "" },
    { key: "end", label: "End", type: "datetime", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.projectSlug ?? "").trim();
    if (!project) throw new Error("`projectSlug` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      full: p.full === true ? "true" : undefined,
      statsPeriod: (p.statsPeriod as string) || undefined,
      start: (p.start as string) || undefined,
      end: (p.end as string) || undefined,
    };

    ctx.log("info", "listing Sentry events", { org, project, returnAll, limit });

    return await client.requestAll(
      `/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/events/`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
