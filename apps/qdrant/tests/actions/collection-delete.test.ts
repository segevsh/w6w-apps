import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/collection-delete.ts";

Deno.test("collection-delete: deletes once the name is typed twice", async () => {
  const { ctx, calls, logs } = mockCtx([ok(true)], { display });
  const result = await action.execute!({ collection: "docs", confirmName: "docs" }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
  assertEquals(logs[0].level, "warn");
});

/**
 * The whole point of the second field: a workflow parameter with a typo is how
 * the wrong collection gets destroyed, and re-embedding a corpus is real money.
 */
Deno.test("collection-delete: a mismatched confirmation refuses, and no request goes out", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", confirmName: "doc" }, ctx),
    Error,
    "must match the collection name exactly",
  );
  assertEquals(calls.length, 0);
});

Deno.test("collection-delete: a missing confirmation refuses", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs" }, ctx),
    Error,
    "confirmName",
  );
  assertEquals(calls.length, 0);
});

Deno.test("collection-delete: the error names both strings so the typo is visible", async () => {
  const { ctx } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ collection: "prod-docs", confirmName: "prod-doc" }, ctx),
    Error,
  );
  assert(error.message.includes("prod-docs"), error.message);
  assert(error.message.includes("prod-doc"), error.message);
});

Deno.test("collection-delete: surrounding whitespace does not defeat the confirmation", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  await action.execute!({ collection: " docs ", confirmName: "docs " }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs");
});

Deno.test("collection-delete: needs a collection", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ confirmName: "docs" }, ctx),
    Error,
    "collection",
  );
});
