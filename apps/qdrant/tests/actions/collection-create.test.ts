import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/collection-create.ts";

Deno.test("collection-create: PUTs the vector configuration", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  const result = await action.execute!({ collection: "docs", vectorSize: 1536 }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!).vectors, { size: 1536, distance: "Cosine" });
  assertEquals(result, { created: true, collection: "docs" });
});

/**
 * The wrong distance does not error — it ranks by the wrong notion of
 * closeness, and the search just looks poor.
 */
Deno.test("collection-create: the distance metric is sent as chosen", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  await action.execute!({ collection: "docs", vectorSize: 768, distance: "Dot" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).vectors.distance, "Dot");
});

Deno.test("collection-create: on-disk storage is only sent when asked for", async () => {
  const off = mockCtx([ok(true)], { display });
  await action.execute!({ collection: "docs", vectorSize: 4 }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).vectors.on_disk, undefined);

  const on = mockCtx([ok(true)], { display });
  await action.execute!({ collection: "docs", vectorSize: 4, onDisk: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).vectors.on_disk, true);
});

/** A zero or fractional dimension would build a collection nothing can use. */
Deno.test("collection-create: an unusable vector size is refused before the request", async () => {
  for (const vectorSize of [0, -1, 1.5]) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(
      async () => await action.execute!({ collection: "docs", vectorSize }, ctx),
      Error,
      "positive integer",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("collection-create: named vectors replace size and distance entirely", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  await action.execute!({
    collection: "docs",
    vectors: '{"title":{"size":384,"distance":"Cosine"},"body":{"size":1536,"distance":"Cosine"}}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body.vectors), ["title", "body"]);
  assertEquals(body.vectors.size, undefined);
});

Deno.test("collection-create: named vectors make vectorSize unnecessary", async () => {
  const { ctx } = mockCtx([ok(true)], { display });
  await action.execute!({ collection: "docs", vectors: '{"title":{"size":384}}' }, ctx);
});

Deno.test("collection-create: sparse vectors are sent under Qdrant's own key", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  await action.execute!({ collection: "docs", vectorSize: 4, sparseVectors: '{"text":{}}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sparse_vectors, { text: {} });
});

Deno.test("collection-create: needs a name", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ vectorSize: 4 }, ctx),
    Error,
    "collection",
  );
  assertEquals(calls.length, 0);
});

/** Creating twice is a 409, not a no-op, so the action is not idempotent. */
Deno.test("collection-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(/PERMANENT/.test(action.description!), action.description);
});
