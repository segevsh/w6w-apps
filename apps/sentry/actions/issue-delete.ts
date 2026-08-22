import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `DELETE /api/0/organizations/{org}/issues/{issue_id}/` — verified against
 * Sentry's OpenAPI schema (`deleteOrganizationIssue`; scopes `event:admin`).
 *
 * Sentry schedules the deletion and answers `202 Accepted` with no body, so
 * this returns the issue id and the status rather than a deleted object.
 */
const action: ActionDefinition = {
  key: "issue-delete",
  type: "perform",
  resource: "issue",
  title: "Delete an issue",
  description: "Permanently remove an issue and its events. Sentry processes this asynchronously.",
  // Deleting an already-deleted issue is not an error worth retrying around:
  // the end state is the same either way.
  idempotent: true,
  params: [
    ORG_PARAM,
    { key: "issueId", label: "Issue ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "deleted", type: "boolean", label: "Accepted for deletion" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "deleting Sentry issue", { org, issueId });

    await client.request(
      `/organizations/${encodeURIComponent(org)}/issues/${encodeURIComponent(issueId)}/`,
      { method: "DELETE" },
    );
    return { id: issueId, deleted: true };
  },
};

export default action;
