import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/scheduled-plan-list.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const plans = [
  {
    id: "1",
    name: "Weekly revenue",
    enabled: true,
    crontab: "0 8 * * 1",
    look_id: "7",
    scheduled_plan_destination: [
      { type: "email", address: "cfo@example.com", format: "csv" },
      { type: "email", address: "left@example.com", format: "csv" },
    ],
  },
  {
    id: "2",
    name: "Nightly export",
    enabled: true,
    dashboard_id: "12",
    scheduled_plan_destination: [{ type: "s3", address: "s3://bucket/path", format: "csv" }],
  },
  { id: "3", name: "Retired", enabled: false, scheduled_plan_destination: [] },
];

/** A schedule is a recurring warehouse query and a recurring export. */
Deno.test("scheduled-plan-list: counts enabled plans, recipients and external delivery", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: plans }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/scheduled_plans");
  assertEquals(new URL(calls[0].url).searchParams.get("all_users"), "true");
  assertEquals(result.count, 3);
  assertEquals(result.enabledCount, 2);
  assertEquals(result.disabledCount, 1);
  assertEquals(result.recipientCount, 3);
  assertEquals(result.destinationTypes, ["email", "s3"]);
  assertEquals(result.externalDeliveryCount, 1);
});

/** A recipient list is itself worth being careful with. */
Deno.test("scheduled-plan-list: withholds addresses unless asked for", async () => {
  const { ctx } = mockCtx([{ status: 200, body: plans }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const serialised = JSON.stringify(result.plans);
  assert(!/cfo@example\.com/.test(serialised), serialised);
  assert(/"type":"email"/.test(serialised), serialised);
});

Deno.test("scheduled-plan-list: includeDestinations returns the addresses", async () => {
  const { ctx } = mockCtx([{ status: 200, body: plans }], D);
  const result = await action.execute({ includeDestinations: true }, ctx) as Record<
    string,
    unknown
  >;
  assert(/cfo@example\.com/.test(JSON.stringify(result.plans)));
});

Deno.test("scheduled-plan-list: allUsers can be turned off", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({ allUsers: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("all_users"), "false");
});

/** The log is counts, never an address. */
Deno.test("scheduled-plan-list: never logs a recipient", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: plans }], D);
  await action.execute({ includeDestinations: true }, ctx);
  const data = JSON.stringify(logs.map((l) => l.data));
  assert(!/@example\.com|s3:\/\//.test(data), data);
});

/** A disabled plan is still listed, and counting without checking counts the dead. */
Deno.test("scheduled-plan-list: disabled plans contribute no recipients", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ ...plans[0], enabled: false }],
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.recipientCount, 0);
  assertEquals(result.enabledCount, 0);
});
