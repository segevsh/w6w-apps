import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/payload-set.ts";

const done = ok({ operation_id: 11, status: "completed" });

/** The thing `point-upsert` cannot do, because upsert replaces the point. */
Deno.test("payload-set: merges fields into the named points", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  await action.execute!({ collection: "docs", payload: '{"reviewed":true}', ids: "1,2" }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points/payload",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.payload, { reviewed: true });
  assertEquals(body.points, [1, 2]);
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "true");
});

Deno.test("payload-set: a filter labels every matching point in one call", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  await action.execute!({
    collection: "docs",
    payload: '{"tier":"archive"}',
    filter: '{"must":[{"key":"age","range":{"gt":365}}]}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.points, undefined);
  assertEquals(body.filter.must.length, 1);
});

Deno.test("payload-set: an empty filter object is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ collection: "docs", payload: '{"a":1}', filter: "{}" }, ctx),
    Error,
    "every point in the collection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payload-set: an empty payload is refused rather than sent as a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", payload: "{}", ids: "1" }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payload-set: needs some way to choose the points", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", payload: '{"a":1}' }, ctx),
    Error,
    "`ids` or a `filter`",
  );
});

Deno.test("payload-set: malformed payload JSON says which field", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", payload: "{oops", ids: "1" }, ctx),
    Error,
    "`payload` is not valid JSON",
  );
});

Deno.test("payload-set: writes under a nested key when asked", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  await action.execute!({
    collection: "docs",
    payload: '{"score":1}',
    ids: "1",
    key: "review",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).key, "review");
});

/** Field names are safe to log; the values are the caller's data. */
Deno.test("payload-set: logs the field names, never the values", async () => {
  const { ctx, logs } = mockCtx([done], { display });
  await action.execute!({ collection: "docs", payload: '{"note":"tuna"}', ids: "1" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { collection: "docs", fields: ["note"] });
});

Deno.test("payload-set: needs a collection", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ payload: '{"a":1}', ids: "1" }, ctx),
    Error,
    "collection",
  );
});
