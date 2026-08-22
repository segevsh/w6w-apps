import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/audit-logs/` — who changed what.
 *
 * The events that explain a change nobody remembers making: a job's schedule
 * edited, an environment's dbt version bumped, a permission granted, a service
 * token created. On an analytics platform those changes are usually the cause
 * of "the numbers moved and nothing was deployed".
 *
 * ## Two things to know before wiring it up
 *
 * **It is Enterprise-only.** dbt's own spec says so, and on a lower plan this
 * answers `403` rather than an empty list. That is reported as what it is
 * rather than raised as a mysterious failure, so a workflow can degrade
 * gracefully instead of erroring every hour on a plan that will never have it.
 *
 * **The window is limited.** dbt keeps recent events on this endpoint and
 * offers a separate export for anything older, so this is a monitor, not an
 * archive.
 */
const action: ActionDefinition = {
  key: "audit-log-list",
  type: "read",
  resource: "audit-log",
  title: "List audit log events",
  description:
    "Who changed what in dbt Cloud — the usual explanation for numbers moving with no deploy. " +
    "Enterprise-only, and reported as such rather than failing.",
  params: [...LIST_PARAMS],
  output: [
    { key: "events", type: "array", label: "Audit log events" },
    { key: "count", type: "number", label: "Events returned" },
    { key: "available", type: "boolean", label: "False when the plan does not include audit logs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    try {
      const { items } = await client.requestAll(
        `/api/v3/accounts/${client.accountId}/audit-logs/`,
        {},
        want,
      );
      return { events: items, count: items.length, available: true };
    } catch (err) {
      // Enterprise-only. A plan that will never have it should not error hourly.
      if (/\b403\b/.test(String(err))) {
        ctx.log("info", "dbt Cloud audit logs are not available on this account's plan");
        return {
          events: [],
          count: 0,
          available: false,
          message:
            "audit logs are an Enterprise feature and this account's plan does not include " +
            "them",
        };
      }
      throw err;
    }
  },
};

export default action;
