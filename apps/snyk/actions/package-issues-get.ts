import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/packages/{purl}/issues` — verified against Snyk's own
 * API document (`getIssuesPerPurl`).
 *
 * Ask what Snyk knows about **an arbitrary package**, whether or not it appears
 * in any of your projects — "does `lodash@4.17.20` have anything open against
 * it" answered directly. That makes it the action a dependency-review or
 * pre-merge workflow reaches for.
 *
 * The package is identified by **purl** (`pkg:npm/lodash@4.17.20`), which
 * contains `/`, `@` and sometimes `%` — so it is percent-encoded into the path.
 * An unencoded purl would address a different endpoint entirely.
 */
const action: ActionDefinition = {
  key: "package-issues-get",
  type: "read",
  resource: "package",
  title: "Get a package's issues",
  description: "List known issues for one package version, by purl.",
  params: [
    ORG_PARAM,
    {
      key: "purl",
      label: "Package URL (purl)",
      type: "string",
      required: true,
      default: "",
      placeholder: "pkg:npm/lodash@4.17.20",
      hint: "A Package URL. Encoded automatically — paste it as-is.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const purl = String(p.purl ?? "").trim();
    if (!purl) throw new Error("`purl` is required");
    if (!purl.startsWith("pkg:")) {
      // Failing here names the format; Snyk's 404 would not.
      throw new Error(`\`purl\` must be a Package URL starting with "pkg:" — got "${purl}"`);
    }

    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "getting Snyk package issues", { org, purl });

    return await new SnykClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/packages/${encodeURIComponent(purl)}/issues`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
