import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/point-delete.ts";

const done = ok({ operation_id: 3, status: "completed" });

Deno.test("point-delete: deleting by id names exactly what goes", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  const result = await action.execute!({ collection: "docs", ids: "1,2" }, ctx) as {
    byFilter: boolean;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points/delete",
  );
  assertEquals(JSON.parse(calls[0].body!).points, [1, 2]);
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "true");
  assertEquals(result.byFilter, false);
});

/** A filtered delete has no undo, so it needs the caller to say so. */
Deno.test("point-delete: a filtered delete is refused without the acknowledgement", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        collection: "docs",
        filter: '{"must":[{"key":"tenant","match":{"value":"acme"}}]}',
      }, ctx),
    Error,
    "confirmFilterDelete",
  );
  assertEquals(calls.length, 0);
});

Deno.test("point-delete: acknowledged, the filter goes through and is logged as a warning", async () => {
  const { ctx, calls, logs } = mockCtx([done], { display });
  const result = await action.execute!({
    collection: "docs",
    filter: '{"must":[{"key":"tenant","match":{"value":"acme"}}]}',
    confirmFilterDelete: true,
  }, ctx) as { byFilter: boolean };
  assertEquals(JSON.parse(calls[0].body!).filter.must.length, 1);
  assertEquals(result.byFilter, true);
  assertEquals(logs[0].level, "warn");
  assert(/no undo/.test(logs[0].message), logs[0].message);
});

/**
 * `{}` is a filter that matches every point. Qdrant accepts it and empties the
 * collection.
 */
Deno.test("point-delete: an empty filter object is refused even when acknowledged", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ collection: "docs", filter: "{}", confirmFilterDelete: true }, ctx),
    Error,
    "matches every point",
  );
  assertEquals(calls.length, 0);
});

Deno.test("point-delete: ids and a filter together are refused — Qdrant takes one selector", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        collection: "docs",
        ids: "1",
        filter: '{"must":[]}',
        confirmFilterDelete: true,
      }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("point-delete: neither selector is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs" }, ctx),
    Error,
    "`ids` or a `filter`",
  );
});

Deno.test("point-delete: an unusable id is caught before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", ids: "doc-42" }, ctx),
    Error,
    "hash it into a UUID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("point-delete: needs a collection", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ ids: "1" }, ctx), Error, "collection");
});
