import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/objects-batch.ts";

const display = { appId: "APPID" };

Deno.test("objects-batch: wraps the requests array as Algolia's body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 9, objectIDs: ["1"] } }], {
    display,
  });
  await action.execute!({
    indexName: "products",
    requests: '[{"action":"addObject","body":{"objectID":"1"}}]',
  }, ctx);
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products/batch");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ action: "addObject", body: { objectID: "1" } }],
  });
});

Deno.test("objects-batch: an empty batch is rejected first", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p", requests: "[]" }, ctx),
    Error,
    "`requests`",
  );
  assertEquals(calls.length, 0);
});
