import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/index-create.ts";

const done = ok({ operation_id: 5, status: "completed" });

Deno.test("index-create: PUTs the field and its type", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  await action.execute!({ collection: "docs", field: "tenant", schema: "keyword" }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://xyz.cloud.qdrant.io:6333/collections/docs/index",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { field_name: "tenant", field_schema: "keyword" });
  assertEquals(new URL(calls[0].url).searchParams.get("wait"), "true");
});

Deno.test("index-create: keyword is the default type", async () => {
  const { ctx, calls } = mockCtx([done], { display });
  await action.execute!({ collection: "docs", field: "tenant" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).field_schema, "keyword");
});

/** A number indexed as keyword cannot answer a range query. */
Deno.test("index-create: the declared type reaches the wire unchanged", async () => {
  for (const schema of ["integer", "datetime", "geo", "text", "uuid"]) {
    const { ctx, calls } = mockCtx([done], { display });
    await action.execute!({ collection: "docs", field: "created_at", schema }, ctx);
    assertEquals(JSON.parse(calls[0].body!).field_schema, schema);
  }
});

Deno.test("index-create: needs a collection and a field", async () => {
  const noCollection = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ field: "tenant" }, noCollection.ctx),
    Error,
    "collection",
  );
  const noField = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs" }, noField.ctx),
    Error,
    "`field` is required",
  );
  assertEquals(noField.calls.length, 0);
});

Deno.test("index-create: logs the field it indexed", async () => {
  const { ctx, logs } = mockCtx([done], { display });
  await action.execute!({ collection: "docs", field: "tenant" }, ctx);
  assertEquals(logs[0].data, { collection: "docs", field: "tenant" });
});

/** Filtering works without an index — by scanning — so the cost is silent. */
Deno.test("index-create: says filtering works without it, which is the trap", () => {
  assert(/WITHOUT this/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
