import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/delete-records.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("delete-records: DELETEs /records with the filter in the body", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { numberDeleted: 3 } }]);
  const out = await action.execute({ tableId: "bck1", where: "{6.EX.'old'}" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/records");
  assertEquals(body(calls[0].body), { from: "bck1", where: "{6.EX.'old'}" });
  assertEquals(out.numberDeleted, 3);
});

Deno.test("delete-records: accepts a record ID array as the filter", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { numberDeleted: 2 } }]);
  await action.execute({ tableId: "bck1", recordIds: [12, 13] }, ctx);
  assertEquals(body(calls[0].body).where, [12, 13]);
});

Deno.test("delete-records: refuses an empty filter without calling the API", () => {
  // Guards the interpolated-filter accident: an upstream step yielding nothing
  // must not become "delete the table".
  for (const input of [{ tableId: "bck1" }, { tableId: "bck1", where: "   " }]) {
    const { ctx, calls } = mockQbCtx([]);
    // Synchronous by design: the guard runs before any request is attempted.
    const err = assertThrows(() => action.execute(input, ctx), Error);
    assert((err as Error).message.includes("{3.GT.0}"));
    assertEquals(calls.length, 0);
  }
});

Deno.test("delete-records: refuses an empty record ID array too", () => {
  const { ctx, calls } = mockQbCtx([]);
  assertThrows(() => action.execute({ tableId: "bck1", recordIds: [] }, ctx), Error);
  assertEquals(calls.length, 0);
});

Deno.test("delete-records: the documented delete-all filter is allowed through", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { numberDeleted: 90 } }]);
  await action.execute({ tableId: "bck1", where: "{3.GT.0}" }, ctx);
  assertEquals(body(calls[0].body).where, "{3.GT.0}");
});

Deno.test("delete-records: declares idempotent false", () => {
  // Re-running a filter that now matches different rows is not the same
  // operation twice, so a retry is not safe to replay blindly.
  assertEquals(action.idempotent, false);
});
