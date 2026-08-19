import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, query } from "../lib/client.ts";

/**
 * `GET /v1/workspaces` — the containers everything else lives in.
 *
 * ## What this application can actually reach
 *
 * An Airbyte application inherits the permissions of the user who created it,
 * so this list is the honest answer to "what does this credential see". A
 * workflow scoped to one team's pipelines and a credential that can reach
 * every workspace in the organisation are different things, and only this call
 * tells them apart.
 *
 * ## Most instances have exactly one
 *
 * Which is why the workspace filters on the other actions are optional. They
 * matter when they matter — a company running separate workspaces per team or
 * per environment — and are noise otherwise.
 */
const action: ActionDefinition = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List workspaces",
  description:
    "The containers connections live in, and the honest answer to what this application " +
    "reaches — an Airbyte application carries the permissions of the user who created it, which " +
    "is often every workspace in the organisation.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "workspaces", type: "array", label: "The workspaces" },
    { key: "count", type: "number", label: "How many this application reaches" },
    { key: "ids", type: "array", label: "Their ids" },
    { key: "names", type: "array", label: "Their names" },
    { key: "single", type: "boolean", label: "Whether there is only one, as usual" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const body = await new AirbyteClient(ctx).request<{
      data?: Array<{ workspaceId?: string; name?: string; dataResidency?: string }>;
    }>("/workspaces", {
      query: query({
        limit: Math.max(1, Math.min(1000, Number(p.limit ?? 100))),
        offset: Math.max(0, Number(p.offset ?? 0)),
      }),
    });

    const workspaces = body?.data ?? [];
    if (workspaces.length > 1) {
      ctx.log(
        "info",
        "this application reaches more than one workspace — it carries the permissions of the " +
          "user who created it, which is often broader than a workflow needs",
        { count: workspaces.length },
      );
    }

    return {
      workspaces: workspaces.map((workspace) => ({
        workspaceId: workspace?.workspaceId,
        name: workspace?.name,
        dataResidency: workspace?.dataResidency,
      })),
      count: workspaces.length,
      ids: workspaces.map((workspace) => workspace?.workspaceId).filter(Boolean),
      names: workspaces.map((workspace) => workspace?.name).filter(Boolean),
      single: workspaces.length === 1,
    };
  },
};

export default action;
