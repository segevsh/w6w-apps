import type { ActionDefinition } from "@w6w/types";
import { compact, SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `PUT /api/0/organizations/{org}/issues/{issue_id}/` — verified against
 * Sentry's OpenAPI schema (`updateOrganizationIssue`; scopes `event:write`).
 *
 * The schema lists every body property under `required`, which is an artefact
 * of how it is generated — the endpoint is a partial update and Sentry applies
 * only the fields present. So only the fields the caller actually set are sent.
 *
 * `statusDetails` is where "resolve in the next release" lives
 * (`{"inNextRelease": true}`, `{"inRelease": "1.2.3"}`, `{"ignoreDuration": 30}`);
 * it is exposed as JSON rather than modelled, because its shape depends on the
 * status it accompanies.
 */
const action: ActionDefinition = {
  key: "issue-update",
  type: "perform",
  resource: "issue",
  title: "Update an issue",
  description: "Resolve, ignore, assign, or re-prioritise an issue.",
  // Same body applied twice lands in the same end state — Sentry stores the
  // fields given rather than incrementing anything.
  idempotent: true,
  params: [
    ORG_PARAM,
    { key: "issueId", label: "Issue ID", type: "string", required: true, default: "" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "resolved", label: "Resolved" },
        { value: "resolvedInNextRelease", label: "Resolved in next release" },
        { value: "unresolved", label: "Unresolved" },
        { value: "ignored", label: "Ignored" },
      ],
    },
    {
      key: "statusDetails",
      label: "Status Details",
      type: "json",
      default: "",
      placeholder: '{"inRelease": "1.2.3"}',
      hint: 'Optional qualifier for the status, e.g. {"inNextRelease": true}.',
    },
    {
      key: "assignedTo",
      label: "Assign To",
      type: "string",
      default: "",
      placeholder: "user:12345 or team:6789",
      hint: "A username/email, or the `user:<id>` / `team:<id>` form. Empty string unassigns.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      default: "",
      options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    { key: "isBookmarked", label: "Bookmarked", type: "boolean", default: null },
    { key: "isSubscribed", label: "Subscribed", type: "boolean", default: null },
    { key: "isPublic", label: "Public", type: "boolean", default: null },
    { key: "hasSeen", label: "Mark as Seen", type: "boolean", default: null },
  ],
  output: [
    { key: "id", type: "string", label: "Issue ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "statusDetails", type: "object", label: "Status details" },
    { key: "assignedTo", type: "object", label: "Assignee" },
    { key: "isBookmarked", type: "boolean", label: "Bookmarked" },
    { key: "isSubscribed", type: "boolean", label: "Subscribed" },
    { key: "isPublic", type: "boolean", label: "Public" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");

    let statusDetails: unknown = undefined;
    if (typeof p.statusDetails === "string" && p.statusDetails.trim()) {
      try {
        statusDetails = JSON.parse(p.statusDetails);
      } catch {
        throw new Error("`statusDetails` is not valid JSON");
      }
    } else if (p.statusDetails && typeof p.statusDetails === "object") {
      statusDetails = p.statusDetails;
    }

    const body = compact({
      status: p.status,
      statusDetails,
      priority: p.priority,
      // An empty string is meaningful here — it unassigns — so it is only
      // dropped when the caller left the field untouched (null/undefined).
      assignedTo: p.assignedTo === null || p.assignedTo === undefined
        ? undefined
        : String(p.assignedTo),
      isBookmarked: typeof p.isBookmarked === "boolean" ? p.isBookmarked : undefined,
      isSubscribed: typeof p.isSubscribed === "boolean" ? p.isSubscribed : undefined,
      isPublic: typeof p.isPublic === "boolean" ? p.isPublic : undefined,
      hasSeen: typeof p.hasSeen === "boolean" ? p.hasSeen : undefined,
    });
    if (typeof p.assignedTo === "string" && p.assignedTo === "") body.assignedTo = "";
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "updating Sentry issue", { org, issueId, fields: Object.keys(body) });

    return await client.request(
      `/organizations/${encodeURIComponent(org)}/issues/${encodeURIComponent(issueId)}/`,
      { method: "PUT", body },
    );
  },
};

export default action;
