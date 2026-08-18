import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/item-usage-list.ts";

const usages = ok({
  items: [
    { item_uuid: "i1", vault_uuid: "v1", user: { uuid: "u1" }, used_version: 3 },
    { item_uuid: "i1", vault_uuid: "v1", user: { uuid: "u2" }, used_version: 2 },
    { item_uuid: "i2", vault_uuid: "v1", user: { uuid: "u1" }, used_version: 1 },
  ],
  cursor: "c1",
  has_more: false,
});

Deno.test("item-usage-list: reads who opened which item", async () => {
  const { ctx, calls } = mockCtx([usages], { display: eventsDisplay });
  const result = await action.execute!({}, ctx) as {
    count: number;
    uniqueItems: number;
    uniqueActors: number;
  };
  assertEquals(calls[0].url, "https://events.1password.com/api/v2/itemusages");
  assertEquals(result.count, 3);
  assertEquals(result.uniqueItems, 2);
  assertEquals(result.uniqueActors, 2);
});

Deno.test("item-usage-list: hasMore is the stop condition, not the cursor", async () => {
  const { ctx } = mockCtx([usages], { display: eventsDisplay });
  const result = await action.execute!({}, ctx) as { hasMore: boolean; cursor: string };
  assertEquals(result.hasMore, false);
  assertEquals(result.cursor, "c1");
});

Deno.test("item-usage-list: a continuation sends the cursor alone", async () => {
  const { ctx, calls } = mockCtx([usages], { display: eventsDisplay });
  await action.execute!({ cursor: "c1", limit: 500 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { cursor: "c1" });
});

/** A uuid identifies both a person and the secret they opened. */
Deno.test("item-usage-list: logs counts, never a uuid", async () => {
  const { ctx, logs } = mockCtx([usages], { display: eventsDisplay });
  await action.execute!({}, ctx);
  const dumped = JSON.stringify(logs);
  assert(!dumped.includes("i1"), dumped);
  assert(!dumped.includes("u1"), dumped);
  assertEquals(logs[0].data, { count: 3, uniqueItems: 2 });
});

Deno.test("item-usage-list: a Connect connection is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "**Events**");
  assertEquals(calls.length, 0);
});

/** Reads made through Connect appear here, so an automated consumer is auditable. */
Deno.test("item-usage-list: says it covers reads made through Connect", () => {
  assert(/including reads made through Connect/.test(action.description!), action.description);
});
