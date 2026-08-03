import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-collection.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-collection: GETs the collection by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: { id: "Cities" } } }]);
  await action.execute!({ dataCollectionId: "Cities" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/wix-data/v2/collections/Cities");
  assert(!url.searchParams.has("consistentRead"));
});

Deno.test("get-collection: percent-encodes an id containing a slash", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "My/Coll ection" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/wix-data/v2/collections/My%2FColl%20ection",
  );
});

Deno.test("get-collection: forwards consistentRead when asked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ dataCollectionId: "Cities", consistentRead: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("consistentRead"), "true");
});

Deno.test("get-collection: surfaces a Wix error rather than swallowing it", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "collection not found" } }]);
  const err = await assertRejects(
    async () => {
      await action.execute!({ dataCollectionId: "Nope" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("Wix 404"));
  assert(err.message.includes("collection not found"));
});

Deno.test("get-collection: is a read action", () => {
  assertEquals(action.type, "read");
});
