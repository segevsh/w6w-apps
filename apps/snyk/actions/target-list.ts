import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/targets` — verified against Snyk's own API document
 * (`getOrgsTargets`).
 *
 * A **target** is the repository or artifact source a project came from — the
 * level above `project-list`. One repository is one target with as many
 * projects as it has scanned manifests.
 */
const action: ActionDefinition = {
  key: "target-list",
  type: "read",
  resource: "target",
  title: "List targets",
  description: "List the repositories and sources projects were imported from.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    {
      key: "origin",
      label: "Origin",
      type: "string",
      default: "",
      placeholder: "github",
      hint: "The integration a target came from.",
    },
    {
      key: "excludeEmpty",
      label: "Exclude Empty",
      type: "boolean",
      default: null,
      hint: "Skip targets with no projects.",
    },
    {
      key: "displayName",
      label: "Display Name",
      type: "string",
      default: "",
      hint: "Match on the target's display name.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      origin: (p.origin as string) || undefined,
      exclude_empty: typeof p.excludeEmpty === "boolean" ? String(p.excludeEmpty) : undefined,
      display_name: (p.displayName as string) || undefined,
    };

    ctx.log("info", "listing Snyk targets", { org, returnAll, limit });

    return await new SnykClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/targets`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
