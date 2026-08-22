import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/check-alerts` — verified against Checkly's OpenAPI document
 * (`getV1Checkalerts`).
 *
 * The alerts Checkly **actually sent**, which is a narrower and more useful set
 * than the failures it recorded: a muted check fails without alerting, an alert
 * escalation may hold back the first failure, and a maintenance window
 * suppresses them entirely. Reconciling "why was nobody paged" starts here
 * rather than with the results.
 */
const action: ActionDefinition = {
  key: "check-alert-list",
  type: "read",
  resource: "check-alert",
  title: "List alerts sent",
  description: "The alerts Checkly actually sent — not the same as the failures recorded.",
  params: [
    {
      key: "checkId",
      label: "Check ID",
      type: "string",
      default: "",
      hint: "Narrow to one check. Blank returns the account's alerts.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const checkId = String(p.checkId ?? "").trim();
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const path = checkId ? `/v1/check-alerts/${encodeURIComponent(checkId)}` : "/v1/check-alerts";

    ctx.log("info", "listing Checkly alerts", { scoped: Boolean(checkId), returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(path, {}, returnAll ? Infinity : limit);
  },
};

export default action;
