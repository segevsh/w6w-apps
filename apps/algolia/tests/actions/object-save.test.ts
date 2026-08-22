import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-save.ts";

const display = { appId: "APPID" };

Deno.test("object-save: PUTs the record to the write host, keyed on objectID", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { objectID: "1", taskID: 42 } }], {
    display,
  });
  const result = await action.execute!({
    indexName: "products",
    objectID: "1",
    record: '{"name":"Shoe"}',
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  // Writes go to the primary host, never the DSN one.
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products/1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Shoe" });
  // The taskID is the handle for waiting on the async write.
  assertEquals((result as Record<string, unknown>).taskID, 42);
});

Deno.test("object-save: a record must be a JSON object, not an array", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p", objectID: "1", record: "[1,2]" }, ctx),
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("object-save: index, objectID and record are all required", async () => {
  for (
    const patch of [
      { objectID: "1", record: "{}" },
      { indexName: "p", record: "{}" },
      { indexName: "p", objectID: "1" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error);
    assertEquals(calls.length, 0);
  }
});
