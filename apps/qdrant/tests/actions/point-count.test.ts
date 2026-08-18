import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/point-count.ts";

/**
 * Qdrant defaults `exact` to false and answers with an index estimate. A
 * number that might be wrong looks exactly like one that is right.
 */
Deno.test("point-count: asks for the exact count, against Qdrant's default", async () => {
  const { ctx, calls } = mockCtx([ok({ count: 1204 })], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as {
    count: number;
    exact: boolean;
  };
  assertEquals(
    calls[0].url,
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points/count",
  );
  assertEquals(JSON.parse(calls[0].body!).exact, true);
  assertEquals(result, { count: 1204, exact: true });
});

Deno.test("point-count: the fast estimate is still available", async () => {
  const { ctx, calls } = mockCtx([ok({ count: 1200 })], { display });
  const result = await action.execute!({ collection: "docs", exact: false }, ctx) as {
    exact: boolean;
  };
  assertEquals(JSON.parse(calls[0].body!).exact, false);
  assertEquals(result.exact, false, "the caller has to be able to tell which number they got");
});

/** The cheap way to ask "does this tenant have anything". */
Deno.test("point-count: a filter narrows the count", async () => {
  const { ctx, calls } = mockCtx([ok({ count: 0 })], { display });
  const result = await action.execute!({
    collection: "docs",
    filter: '{"must":[{"key":"tenant","match":{"value":"acme"}}]}',
  }, ctx) as { count: number };
  assertEquals(JSON.parse(calls[0].body!).filter.must.length, 1);
  assertEquals(result.count, 0);
});

Deno.test("point-count: a missing count reads as zero, not NaN", async () => {
  const { ctx } = mockCtx([ok({})], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("point-count: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});

Deno.test("point-count: warns in the description that Qdrant's default is an estimate", () => {
  assert(/ESTIMATE/.test(action.description!), action.description);
});
