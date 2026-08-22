import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/check-groups/{id}/checks` — verified against Checkly's OpenAPI
 * document (`getV1CheckgroupsIdChecks`).
 *
 * The members of a group, with the group's settings already applied — which is
 * why this is worth having over filtering `check-list` by group id: it shows
 * what the checks will actually do, not what they were configured with before
 * the group overrode it.
 */
const action: ActionDefinition = {
  key: "check-group-checks-list",
  type: "read",
  resource: "check-group",
  title: "List a group's checks",
  description: "The checks in a group, with the group's settings applied.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.groupId ?? "").trim();
    if (!id) throw new Error("`groupId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing a Checkly group's checks", { id, returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(
      `/v1/check-groups/${encodeURIComponent(id)}/checks`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
