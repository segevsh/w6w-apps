import type { ActionDefinition } from "@w6w/types";
import { csv, SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/issues/{issue_id}/events/` — verified
 * against Sentry's OpenAPI schema (`listOrganizationIssueEvents`; scopes
 * `event:read`).
 */
const action: ActionDefinition = {
  key: "issue-event-list",
  type: "read",
  resource: "issue",
  title: "List an issue's events",
  description: "List the individual events grouped under one issue.",
  params: [
    ORG_PARAM,
    { key: "issueId", label: "Issue ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
    {
      key: "full",
      label: "Full Event Bodies",
      type: "boolean",
      default: false,
      hint: "Include the stacktrace and the rest of the event payload.",
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      hint: "Sentry search syntax, applied to the events.",
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
    {
      key: "environment",
      label: "Environments",
      type: "string",
      default: "",
      hint: "Comma-separated environment names.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      full: p.full === true ? "true" : undefined,
      query: (p.query as string) || undefined,
      statsPeriod: (p.statsPeriod as string) || undefined,
      start: (p.start as string) || undefined,
      end: (p.end as string) || undefined,
      environment: csv(p.environment),
    };

    ctx.log("info", "listing Sentry issue events", { org, issueId, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/issues/${encodeURIComponent(issueId)}/events/`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
