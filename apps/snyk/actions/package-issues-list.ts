import type { ActionDefinition } from "@w6w/types";
import { csv, resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `POST /orgs/{org_id}/packages/issues` — verified against Snyk's own API
 * document (`listIssuesForManyPurls`).
 *
 * The bulk form of `package-issues-get`: one request for a whole dependency
 * list, which is what a lockfile review needs. It is a POST because the purls
 * go in the body — they are far too long for a query string — and Snyk's
 * JSON:API envelope wraps them.
 */
const action: ActionDefinition = {
  key: "package-issues-list",
  type: "read",
  resource: "package",
  title: "Get issues for many packages",
  description: "List known issues for a set of package versions, by purl.",
  params: [
    ORG_PARAM,
    {
      key: "purls",
      label: "Package URLs (purls)",
      type: "text",
      required: true,
      default: "",
      placeholder: "pkg:npm/lodash@4.17.20, pkg:npm/express@4.17.1",
      hint: "Comma-separated purls.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Issues per package" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const purls = csv(p.purls);
    if (!purls) throw new Error("`purls` is required — at least one Package URL");
    const bad = purls.filter((u) => !u.startsWith("pkg:"));
    if (bad.length) {
      throw new Error(`every purl must start with "pkg:" — got ${bad.join(", ")}`);
    }

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "listing Snyk issues for packages", { org, count: purls.length });

    return await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/packages/issues`,
      {
        method: "POST",
        // JSON:API envelope — Snyk rejects a bare array here.
        body: {
          data: { type: "resource", attributes: { purls: purls.map((purl) => ({ purl })) } },
        },
      },
    );
  },
};

export default action;
