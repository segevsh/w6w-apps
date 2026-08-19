import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

const D = { display: { host: "https://search.internal:8108" } };

Deno.test("document-get: fetches by id and returns the field names", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "1", name: "boot", price: 42 },
  }], D);
  const result = await action.execute({ collection: "products", id: "1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).pathname, "/collections/products/documents/1");
  assertEquals(result.found, true);
  assertEquals(result.fields, ["id", "name", "price"]);
});

Deno.test("document-get: an id with a slash cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "x" } }], D);
  await action.execute({ collection: "products", id: "1/../keys" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/collections/products/documents/1%2F..%2Fkeys");
});

Deno.test("document-get: requires a collection and an id", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({ id: "1" }, ctx), Error, "`collection`");
  await assertRejects(
    async () => await action.execute({ collection: "products" }, ctx),
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});

/** Everything else in this app is a search, with ranking and widening. */
Deno.test("document-get: says it is the only exact read", () => {
  assert(/only EXACT read/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});
