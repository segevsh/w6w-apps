import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-update.ts";

const display = { appId: "APPID" };

Deno.test("object-update: POSTs to the partial path with createIfNotExists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 7 } }], { display });
  await action.execute!({
    indexName: "products",
    objectID: "1",
    attributes: '{"price":89}',
  }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://appid.algolia.net/1/indexes/products/1/partial",
  );
  // Algolia reads the flag as a string.
  assertEquals(new URL(calls[0].url).searchParams.get("createIfNotExists"), "true");
  assertEquals(JSON.parse(calls[0].body!), { price: 89 });
});

Deno.test("object-update: turning off create sends the string false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    indexName: "products",
    objectID: "1",
    attributes: "{}",
    createIfNotExists: false,
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("createIfNotExists"), "false");
});

/** Increment/Decrement compound on a retry, so this cannot claim idempotency. */
Deno.test("object-update: is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("object-update: attributes are required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p", objectID: "1" }, ctx),
    Error,
    "`attributes`",
  );
  assertEquals(calls.length, 0);
});
