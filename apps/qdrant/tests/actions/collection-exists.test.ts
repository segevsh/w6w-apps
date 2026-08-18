import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/collection-exists.ts";

Deno.test("collection-exists: true when it is there", async () => {
  const { ctx, calls } = mockCtx([ok({ exists: true })], { display });
  const result = await action.execute!({ collection: "docs" }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs/exists");
  assertEquals(result, { exists: true });
});

Deno.test("collection-exists: false is a successful answer, not an error", async () => {
  const { ctx } = mockCtx([ok({ exists: false })], { display });
  assertEquals(await action.execute!({ collection: "gone" }, ctx), { exists: false });
});

/**
 * The point of the endpoint: a bad key or an unreachable host must NOT read as
 * "not there", which is what catching a 404 around `collection-get` would do.
 */
Deno.test("collection-exists: a rejected credential still throws", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: { error: "Invalid api key" } } }], {
    display,
  });
  await assertRejects(async () => await action.execute!({ collection: "docs" }, ctx), Error);
});

Deno.test("collection-exists: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});

Deno.test("collection-exists: says why it is a boolean and not a caught 404", () => {
  assert(/swallow a bad key/.test(action.description!), action.description);
});
