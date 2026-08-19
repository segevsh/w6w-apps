import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

const D = { display: { host: "https://nocodb.internal" } };
const hooks = {
  status: 200,
  body: {
    list: [
      {
        id: "h1",
        title: "Notify Slack",
        operation: "insert",
        active: true,
        notification: { type: "URL" },
      },
      { id: "h2", title: "Sync CRM", operation: ["update", "delete"], active: true },
      { id: "h3", title: "Old hook", operation: "insert", active: false },
    ],
  },
};

/** The single most common way a bulk import becomes an incident. */
Deno.test("webhook-list: says what a bulk insert would fire, and warns", async () => {
  const { ctx, calls, logs } = mockCtx([hooks], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/meta/tables/mtbl1/hooks");
  assertEquals(result.onInsert, ["Notify Slack"]);
  assertEquals(result.bulkWriteWillFire, 1);
  assert(
    logs.some((l) => /one per record/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A disabled hook is still listed. */
Deno.test("webhook-list: counts the active hooks apart from the defined ones", async () => {
  const { ctx } = mockCtx([hooks], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
  assertEquals(result.activeCount, 2);
});

/** The operation is sometimes a string and sometimes a list. */
Deno.test("webhook-list: handles both shapes of the operation field", async () => {
  const { ctx } = mockCtx([hooks], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.onUpdate, ["Sync CRM"]);
  assertEquals(result.onDelete, ["Sync CRM"]);
});

Deno.test("webhook-list: a table with no hooks says nothing", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { list: [] } }], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(logs.length, 0);
});

Deno.test("webhook-list: requires a table id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`tableId` is required");
});
