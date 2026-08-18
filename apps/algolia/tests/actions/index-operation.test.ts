import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-operation.ts";

const display = { appId: "APPID" };

Deno.test("index-operation: a move is the atomic re-index swap", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 4 } }], { display });
  await action.execute!({
    indexName: "products_tmp",
    operation: "move",
    destination: "products",
  }, ctx);
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products_tmp/operation");
  assertEquals(JSON.parse(calls[0].body!), { operation: "move", destination: "products" });
});

Deno.test("index-operation: a scoped copy clones configuration only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    indexName: "products",
    operation: "copy",
    destination: "products_staging",
    scope: "settings, synonyms",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).scope, ["settings", "synonyms"]);
});

/** Algolia ignores scope on a move; saying so beats a silently different result. */
Deno.test("index-operation: scope with a move is refused rather than ignored", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        indexName: "a",
        operation: "move",
        destination: "b",
        scope: "settings",
      }, ctx),
    Error,
    "applies to a copy only",
  );
  assertEquals(calls.length, 0);
});

Deno.test("index-operation: a destination is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "a", operation: "copy" }, ctx),
    Error,
    "`destination`",
  );
  assertEquals(calls.length, 0);
});
