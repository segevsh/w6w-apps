import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/maintenance-windows` — verified against Checkly's OpenAPI document
 * (`getV1Maintenancewindows`).
 *
 * Worth reading when alerts have gone quiet: an open window explains it, and a
 * repeating window that outlived its reason explains it for longer.
 */
const action: ActionDefinition = {
  key: "maintenance-window-list",
  type: "read",
  resource: "maintenance-window",
  title: "List maintenance windows",
  description: "List maintenance windows — the usual reason alerts have gone quiet.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Checkly maintenance windows", { returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(
      "/v1/maintenance-windows",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
