import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/payload-delete.ts";

const done = ok({ operation_id: 12, status: "completed" });

/** The shape a retention rule takes: remove the field, keep the vector. */
Deno.test("payload-delete: removes named fields from the named points", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  const result = await action.execute!({
    collection: "docs",
    keys: "email, phone",
    ids: "1",
  }, ctx) as { removed: string[] };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points/payload/delete",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.keys, ["email", "phone"]);
  assertEquals(body.points, [1]);
  assertEquals(result.removed, ["email", "phone"]);
});

Deno.test("payload-delete: a filter reaches every matching point", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  await action.execute!({
    collection: "docs",
    keys: "email",
    filter: '{"must":[{"key":"deleted","match":{"value":true}}]}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.points, undefined);
  assertEquals(body.filter.must.length, 1);
});

Deno.test("payload-delete: an empty filter object is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", keys: "email", filter: "{}" }, ctx),
    Error,
    "every point in the collection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payload-delete: needs fields to remove", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", ids: "1" }, ctx),
    Error,
    "`keys` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payload-delete: needs some way to choose the points", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", keys: "email" }, ctx),
    Error,
    "`ids` or a `filter`",
  );
});

Deno.test("payload-delete: logs the field names it removed", async () => {
  const { ctx, logs } = mockCtx([done], { display });
  await action.execute!({ collection: "docs", keys: "email", ids: "1" }, ctx);
  assertEquals(logs[0].data, { collection: "docs", fields: ["email"] });
});

/** Setting a field to null leaves the key present; a filter on it still matches. */
Deno.test("payload-delete: says removing is not the same as nulling", () => {
  assert(/null is not the same as removing/.test(action.description!), action.description);
});
