import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-task-list-changes.ts";

Deno.test("list-task-list-changes: opens a round at /me/todo/lists/delta", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists/delta");
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
  assertEquals(calls[0].headers["prefer"], undefined);
});

Deno.test("list-task-list-changes: first call carries $select and the maxpagesize Prefer", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ select: ["id", "displayName"], maxPageSize: 2 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id,displayName");
  assertEquals(calls[0].headers["prefer"], "odata.maxpagesize=2");
});

Deno.test("list-task-list-changes: a stored deltaLink is replayed bare", async () => {
  const delta = "https://graph.microsoft.com/v1.0/me/todo/lists/delta?$deltatoken=tok";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  // The token already encodes the round's parameters — re-sending them risks a 400.
  await action.execute!({ deltaLink: delta, select: ["id"], maxPageSize: 5 }, ctx);
  assertEquals(calls[0].url, delta);
  assertEquals(calls[0].headers["prefer"], undefined);
});

Deno.test("list-task-list-changes: surfaces the deltaLink that closes the round", async () => {
  const { ctx } = mockCtx([{
    body: { value: [{ id: "L1" }], "@odata.deltaLink": "https://graph.microsoft.com/v1.0/d" },
  }]);
  const out = await action.execute!({}, ctx);
  assertEquals(out.deltaLink, "https://graph.microsoft.com/v1.0/d");
  assertEquals(out.nextLink, undefined);
});
