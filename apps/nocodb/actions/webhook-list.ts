import type { ActionDefinition } from "@w6w/types";
import { NocoDBClient } from "../lib/client.ts";

/**
 * `GET /api/v2/meta/tables/{tableId}/hooks` — what fires when this table
 * changes.
 *
 * ## The thing to check before a workflow writes to a table
 *
 * NocoDB webhooks fire on insert, update and delete. A workflow that inserts a
 * thousand rows fires a thousand webhooks, and whatever is on the other end —
 * a Slack channel, another automation, an endpoint that emails somebody — gets
 * a thousand of them.
 *
 * That is the single most common way a bulk import becomes an incident, and it
 * is invisible from the data API: nothing in a record response mentions that
 * writing it will call somebody. This is where to look first.
 *
 * ## A disabled webhook is still listed
 *
 * `active: false` stops it firing and leaves it in place, which is how most
 * webhooks end their life. Counting hooks without checking counts the dead
 * ones.
 */
const action: ActionDefinition = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List a table's webhooks",
  description:
    "What fires when this table changes — the thing to check before a bulk write, since " +
    "inserting a thousand rows fires a thousand webhooks and nothing in the data API mentions " +
    "it. Separates the disabled ones, which are still listed.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "webhooks", type: "array", label: "The webhooks" },
    { key: "count", type: "number", label: "How many are defined" },
    { key: "activeCount", type: "number", label: "How many actually fire" },
    { key: "onInsert", type: "array", label: "Fire when a record is created" },
    { key: "onUpdate", type: "array", label: "Fire when a record changes" },
    { key: "onDelete", type: "array", label: "Fire when a record is removed" },
    { key: "bulkWriteWillFire", type: "number", label: "Active hooks a bulk insert would trigger" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");

    const body = await new NocoDBClient(ctx).request<{
      list?: Array<{
        id?: string;
        title?: string;
        event?: string;
        operation?: string | string[];
        active?: boolean;
        notification?: { type?: string };
      }>;
    }>(`/api/v2/meta/tables/${encodeURIComponent(tableId)}/hooks`);

    const hooks = body?.list ?? [];
    const active = hooks.filter((hook) => hook?.active !== false);
    const fires = (hook: { operation?: string | string[] }, operation: string) => {
      const ops = Array.isArray(hook?.operation) ? hook.operation : [hook?.operation];
      return ops.some((op) => String(op ?? "").includes(operation));
    };

    const onInsert = active.filter((hook) => fires(hook, "insert")).map((hook) => hook?.title);
    if (onInsert.length) {
      ctx.log(
        "info",
        "this table has webhooks that fire on insert — a bulk write fires one per record, and " +
          "whatever is on the other end receives all of them",
        { tableId, hooks: onInsert.length },
      );
    }

    return {
      webhooks: hooks.map((hook) => ({
        id: hook?.id,
        title: hook?.title,
        event: hook?.event,
        operation: hook?.operation,
        active: hook?.active !== false,
        notificationType: hook?.notification?.type,
      })),
      count: hooks.length,
      activeCount: active.length,
      onInsert: onInsert.filter(Boolean),
      onUpdate: active.filter((hook) => fires(hook, "update")).map((hook) => hook?.title)
        .filter(Boolean),
      onDelete: active.filter((hook) => fires(hook, "delete")).map((hook) => hook?.title)
        .filter(Boolean),
      bulkWriteWillFire: onInsert.length,
    };
  },
};

export default action;
