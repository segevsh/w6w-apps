import type { ActionDefinition } from "@w6w/types";
import { csv, resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/audit_logs/search` — verified against Snyk's own API
 * document (`listOrgAuditLogs`).
 *
 * Who changed what: policy edits, ignores, project deletions, membership
 * changes. The compliance answer, and the one that explains why an issue
 * stopped being reported.
 */
const action: ActionDefinition = {
  key: "audit-log-list",
  type: "read",
  resource: "auditLog",
  title: "List audit logs",
  description: "Search an organization's audit log by event type, user or date.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    { key: "from", label: "From", type: "datetime", default: "", hint: "ISO 8601." },
    { key: "to", label: "To", type: "datetime", default: "" },
    {
      key: "events",
      label: "Event Types",
      type: "string",
      default: "",
      placeholder: "org.project.delete,org.policy.edit",
      hint: "Comma-separated Snyk event names.",
    },
    {
      key: "excludeEvents",
      label: "Exclude Event Types",
      type: "string",
      default: "",
      hint: "Comma-separated. Cannot be combined with Event Types.",
    },
    { key: "userId", label: "User ID", type: "string", default: "" },
    { key: "projectId", label: "Project ID", type: "string", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const events = csv(p.events);
    const exclude = csv(p.excludeEvents);
    if (events && exclude) {
      // Snyk treats these as mutually exclusive; failing here names the rule.
      throw new Error("set `events` or `excludeEvents`, not both");
    }

    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      from: (p.from as string) || undefined,
      to: (p.to as string) || undefined,
      events,
      exclude_events: exclude,
      user_id: (p.userId as string) || undefined,
      project_id: (p.projectId as string) || undefined,
    };

    ctx.log("info", "listing Snyk audit logs", { org, returnAll, limit });

    return await new SnykClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/audit_logs/search`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
