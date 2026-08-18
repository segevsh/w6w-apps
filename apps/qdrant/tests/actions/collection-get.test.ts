import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/collection-get.ts";

Deno.test("collection-get: green is ready", async () => {
  const { ctx, calls } = mockCtx([ok({ status: "green", points_count: 1204 })], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as { ready: boolean };
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs");
  assertEquals(result.ready, true);
});

/**
 * `yellow` is a collection that answers queries — slowly, and from a partial
 * index. It is what a fresh bulk load looks like, and it is not ready.
 */
Deno.test("collection-get: yellow is not ready, even though queries succeed", async () => {
  const { ctx } = mockCtx(
    [ok({ status: "yellow", points_count: 1204, indexed_vectors_count: 3 })],
    {
      display,
    },
  );
  const result = await action.execute!({ collection: "docs" }, ctx) as {
    ready: boolean;
    indexed_vectors_count: number;
  };
  assertEquals(result.ready, false);
  assertEquals(result.indexed_vectors_count, 3);
});

Deno.test("collection-get: red is not ready", async () => {
  const { ctx } = mockCtx([ok({ status: "red" })], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as { ready: boolean };
  assertEquals(result.ready, false);
});

Deno.test("collection-get: a name with a space is encoded into the path", async () => {
  const { ctx, calls } = mockCtx([ok({ status: "green" })], { display });
  await action.execute!({ collection: "my docs" }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/my%20docs");
});

Deno.test("collection-get: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});

Deno.test("collection-get: explains what yellow means", () => {
  assert(/yellow/.test(action.description!), action.description);
});
