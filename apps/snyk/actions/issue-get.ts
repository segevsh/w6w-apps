import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/issues/{issue_id}` — verified against Snyk's own API
 * document (`getOrgIssueByIssueID`).
 */
const action: ActionDefinition = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get an issue",
  description: "Retrieve one issue with its full detail.",
  params: [
    ORG_PARAM,
    { key: "issueId", label: "Issue ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "data", type: "object", label: "Issue" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
    { key: "links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const issueId = String(p.issueId ?? "").trim();
    if (!issueId) throw new Error("`issueId` is required");

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "getting Snyk issue", { org, issueId });

    return await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/issues/${encodeURIComponent(issueId)}`,
    );
  },
};

export default action;
