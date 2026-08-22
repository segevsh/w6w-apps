import type { ActionDefinition } from "@w6w/types";
import { csv, SentryClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/issues/` — verified against Sentry's own
 * OpenAPI schema (https://github.com/getsentry/sentry-api-schema,
 * `listOrganizationIssues`; scopes `event:read`).
 *
 * The organization-scoped list rather than the project-scoped one
 * (`/projects/{org}/{project}/issues/`): it takes a repeatable `project`
 * filter, so it answers both "issues in this project" and "issues across the
 * org" with one action instead of two.
 */
const action: ActionDefinition = {
  key: "issue-list",
  type: "read",
  resource: "issue",
  title: "List issues",
  description: "List issues for an organization, optionally filtered to projects and a query.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    {
      key: "projects",
      label: "Project IDs or Slugs",
      type: "string",
      default: "",
      hint: "Comma-separated. Leave blank for every project the token can see.",
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      placeholder: "is:unresolved",
      hint: "Sentry search syntax. Sentry applies `is:unresolved` when this is blank.",
    },
    {
      key: "statsPeriod",
      label: "Stats Period",
      type: "string",
      default: "",
      placeholder: "24h",
      hint: "A number followed by h or d, e.g. `24h` or `14d`. Overrides Start/End.",
    },
    { key: "start", label: "Start", type: "datetime", default: "", hint: "ISO-8601." },
    { key: "end", label: "End", type: "datetime", default: "", hint: "ISO-8601." },
    {
      key: "environment",
      label: "Environments",
      type: "string",
      default: "",
      hint: "Comma-separated environment names.",
    },
    {
      key: "sort",
      label: "Sort By",
      type: "select",
      default: "",
      options: [
        { value: "date", label: "Last Seen" },
        { value: "new", label: "First Seen" },
        { value: "trends", label: "Trends" },
        { value: "freq", label: "Events" },
        { value: "user", label: "Users" },
        { value: "inbox", label: "Date Added" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      project: csv(p.projects),
      query: (p.query as string) || undefined,
      statsPeriod: (p.statsPeriod as string) || undefined,
      start: (p.start as string) || undefined,
      end: (p.end as string) || undefined,
      environment: csv(p.environment),
      sort: (p.sort as string) || undefined,
    };

    ctx.log("info", "listing Sentry issues", { org, returnAll, limit });

    return await client.requestAll(
      `/organizations/${encodeURIComponent(org)}/issues/`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
