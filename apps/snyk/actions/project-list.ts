import type { ActionDefinition } from "@w6w/types";
import { csv, resolveOrg, SnykClient } from "../lib/client.ts";
import { LIST_PARAMS, ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/projects` — verified against Snyk's own API document
 * (`listOrgProjects`).
 *
 * A Snyk **project** is one scanned manifest or artifact (a `package.json`, a
 * Dockerfile, a Terraform plan), not a repository — a repository with three
 * lockfiles is three projects under one **target**. `target-list` is the
 * repository-level view.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description: "List an organization's scanned projects.",
  params: [
    ORG_PARAM,
    ...LIST_PARAMS,
    {
      key: "targetId",
      label: "Target IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Only projects under these targets.",
    },
    {
      key: "names",
      label: "Names",
      type: "string",
      default: "",
      hint: "Comma-separated exact project names.",
    },
    {
      key: "origins",
      label: "Origins",
      type: "string",
      default: "",
      placeholder: "github,cli",
      hint: "Comma-separated integration origins.",
    },
    {
      key: "types",
      label: "Types",
      type: "string",
      default: "",
      placeholder: "npm,maven",
      hint: "Comma-separated project types.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const org = resolveOrg(ctx.connection, p.orgId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      target_id: csv(p.targetId),
      names: csv(p.names),
      origins: csv(p.origins),
      types: csv(p.types),
    };

    ctx.log("info", "listing Snyk projects", { org, returnAll, limit });

    return await new SnykClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/projects`,
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
