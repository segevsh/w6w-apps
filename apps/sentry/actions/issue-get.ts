import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/issues/{issue_id}/` — verified against
 * Sentry's OpenAPI schema (`getOrganizationIssue`; scopes `event:read`).
 */
const action: ActionDefinition = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get an issue",
  description: "Retrieve a single issue by its numeric ID.",
  params: [
    ORG_PARAM,
    {
      key: "issueId",
      label: "Issue ID",
      type: "string",
      required: true,
      default: "",
      hint: "The numeric issue ID, as it appears in the issue's Sentry URL.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "shortId", type: "string", label: "Short ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "culprit", type: "string", label: "Culprit" },
    { key: "level", type: "string", label: "Level" },
    { key: "status", type: "string", label: "Status" },
    { key: "count", type: "string", label: "Event count" },
    { key: "userCount", type: "number", label: "Users affected" },
    { key: "firstSeen", type: "string", label: "First seen" },
    { key: "lastSeen", type: "string", label: "Last seen" },
    { key: "permalink", type: "string", label: "Permalink" },
    { key: "project", type: "object", label: "Project" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "getting Sentry issue", { org, issueId });

    return await client.request(
      `/organizations/${encodeURIComponent(org)}/issues/${encodeURIComponent(issueId)}/`,
    );
  },
};

export default action;
