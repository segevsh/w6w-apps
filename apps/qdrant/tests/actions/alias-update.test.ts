import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/alias-update.ts";

/**
 * The zero-downtime re-index: build `docs_v4`, then move `docs` onto it. Both
 * operations go in one batch, which Qdrant applies atomically — no reader ever
 * sees the alias resolving to nothing.
 */
Deno.test("alias-update: sends the delete and the create in one atomic batch", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  const result = await action.execute!({ alias: "docs", collection: "docs_v4" }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/aliases");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).actions, [
    { delete_alias: { alias_name: "docs" } },
    { create_alias: { collection_name: "docs_v4", alias_name: "docs" } },
  ]);
  assertEquals(result, { alias: "docs", collection: "docs_v4", moved: true });
});

Deno.test("alias-update: the delete comes first, so the create is not undone", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  await action.execute!({ alias: "docs", collection: "docs_v4" }, ctx);
  const actions = JSON.parse(calls[0].body!).actions as Array<Record<string, unknown>>;
  assert("delete_alias" in actions[0], JSON.stringify(actions));
  assert("create_alias" in actions[1], JSON.stringify(actions));
});

Deno.test("alias-update: a first-time alias can skip the delete", async () => {
  const { ctx, calls } = mockCtx([ok(true)], { display });
  await action.execute!({ alias: "docs", collection: "docs_v1", deleteOthers: false }, ctx);
  const actions = JSON.parse(calls[0].body!).actions as unknown[];
  assertEquals(actions.length, 1);
});

Deno.test("alias-update: needs both names", async () => {
  const noAlias = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs_v4" }, noAlias.ctx),
    Error,
    "`alias` is required",
  );
  const noCollection = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ alias: "docs" }, noCollection.ctx),
    Error,
    "`collection` is required",
  );
  assertEquals(noCollection.calls.length, 0);
});

Deno.test("alias-update: logs where the alias now points", async () => {
  const { ctx, logs } = mockCtx([ok(true)], { display });
  await action.execute!({ alias: "docs", collection: "docs_v4" }, ctx);
  assertEquals(logs[0].data, { alias: "docs", collection: "docs_v4" });
});

/** The old collection is not deleted — it keeps costing memory until someone acts. */
Deno.test("alias-update: says the old collection stays behind", () => {
  assert(/old collection stays/.test(action.description!), action.description);
});
