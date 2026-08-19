import type { ActionDefinition } from "@w6w/types";
import { LookerClient, query } from "../lib/client.ts";

/**
 * `GET /api/4.0/scheduled_plans` — what Looker sends on its own, to whom.
 *
 * ## Every schedule is a recurring warehouse query and a recurring data export
 *
 * A scheduled plan runs a Look or a dashboard on a timer and delivers the
 * result — by email, to S3, to SFTP, to a webhook. So each one is two things
 * worth knowing about: a query that costs money every time it fires, and
 * business data leaving Looker on a schedule nobody is watching.
 *
 * ## The destinations are where the data actually goes
 *
 * `scheduled_plan_destination` carries an address per recipient. An email
 * schedule that has quietly been going to somebody who left the company is not
 * visible anywhere else, and this is the only enumeration of it.
 *
 * So this action returns the destination **types and counts**, and the
 * addresses only when explicitly asked for — because an export of every
 * recipient in an instance is itself a list worth being careful with.
 *
 * ## A disabled plan is still listed
 *
 * `enabled: false` stops it running and leaves it in place, which is how most
 * schedules end their life. Counting plans without checking is counting the
 * dead ones too.
 */
const action: ActionDefinition = {
  key: "scheduled-plan-list",
  type: "search",
  resource: "scheduled-plan",
  title: "List scheduled plans",
  description:
    "What Looker sends on its own, and where. Each plan is a recurring WAREHOUSE QUERY and a " +
    "recurring data export — and the destination list is the only place a schedule still going " +
    "to somebody who left is visible.",
  params: [
    {
      key: "allUsers",
      label: "All users' plans",
      type: "boolean",
      default: true,
      hint: "Off, only this credential's own. Seeing everybody's needs the `see_schedules` " +
        "permission.",
    },
    {
      key: "includeDestinations",
      label: "Include recipient addresses",
      type: "boolean",
      default: false,
      hint: "Off, only the types and counts come back — an export of every recipient in an " +
        "instance is itself a list worth being careful with.",
    },
  ],
  output: [
    { key: "plans", type: "array", label: "The scheduled plans" },
    { key: "count", type: "number", label: "How many" },
    { key: "enabledCount", type: "number", label: "How many actually run" },
    { key: "disabledCount", type: "number", label: "Left in place and not running" },
    { key: "destinationTypes", type: "array", label: "Where data goes — email, s3, sftp, webhook" },
    { key: "recipientCount", type: "number", label: "Total recipients across enabled plans" },
    { key: "externalDeliveryCount", type: "number", label: "Plans delivering outside email" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const all = await new LookerClient(ctx).request<
      Array<{
        id?: string;
        name?: string;
        enabled?: boolean;
        crontab?: string;
        look_id?: string;
        dashboard_id?: string;
        scheduled_plan_destination?: Array<{ type?: string; address?: string; format?: string }>;
      }>
    >("/scheduled_plans", {
      query: query({
        all_users: p.allUsers !== false,
        fields: "id,name,enabled,crontab,look_id,dashboard_id," +
          "scheduled_plan_destination(type,address,format)",
      }),
    });

    const list = Array.isArray(all) ? all : [];
    const enabled = list.filter((plan) => plan?.enabled !== false);

    const types = new Set<string>();
    let recipientCount = 0;
    let externalDeliveryCount = 0;
    for (const plan of enabled) {
      const destinations = plan?.scheduled_plan_destination ?? [];
      recipientCount += destinations.length;
      let external = false;
      for (const destination of destinations) {
        const type = String(destination?.type ?? "");
        if (type) types.add(type);
        if (type && type !== "email") external = true;
      }
      if (external) externalDeliveryCount += 1;
    }

    // Addresses only when asked for — this is a recipient list.
    const includeDestinations = p.includeDestinations === true;
    const plans = list.map((plan) => ({
      id: plan?.id,
      name: plan?.name,
      enabled: plan?.enabled !== false,
      crontab: plan?.crontab,
      lookId: plan?.look_id,
      dashboardId: plan?.dashboard_id,
      destinations: (plan?.scheduled_plan_destination ?? []).map((destination) => ({
        type: destination?.type,
        format: destination?.format,
        ...(includeDestinations ? { address: destination?.address } : {}),
      })),
    }));

    // Counts and types. Never an address.
    ctx.log("info", "listed Looker scheduled plans", {
      count: plans.length,
      enabledCount: enabled.length,
    });

    return {
      plans,
      count: plans.length,
      enabledCount: enabled.length,
      disabledCount: list.length - enabled.length,
      destinationTypes: [...types].sort(),
      recipientCount,
      externalDeliveryCount,
    };
  },
};

export default action;
