import { assert, assertEquals } from "@std/assert";
import action from "../../actions/bulk-insert-data-items.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("bulk-insert-data-items: POSTs the bulk path wrapping each row under `data`", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({
    dataCollectionId: "Cities",
    dataItems: [{ name: "Paris" }, { name: "Lyon" }],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wix-data/v2/bulk/items/insert");
  assertEquals(JSON.parse(calls[0].body!), {
    dataCollectionId: "Cities",
    dataItems: [{ data: { name: "Paris" } }, { data: { name: "Lyon" } }],
  });
});

Deno.test("bulk-insert-data-items: omits returnEntity unless asked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ dataCollectionId: "C", dataItems: [] }, ctx);
  assert(!("returnEntity" in JSON.parse(calls[0].body!)));
  await action.execute!({ dataCollectionId: "C", dataItems: [], returnEntity: true }, ctx);
  assertEquals(JSON.parse(calls[1].body!).returnEntity, true);
});

Deno.test("bulk-insert-data-items: logs the batch size", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "C", dataItems: [{ a: 1 }, { a: 2 }, { a: 3 }] }, ctx);
  assertEquals(logs[0].data, { dataCollectionId: "C", count: 3 });
});

Deno.test("bulk-insert-data-items: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
