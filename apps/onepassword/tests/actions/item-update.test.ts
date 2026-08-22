import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ITEM, ok } from "./_shared.ts";
import action from "../../actions/item-update.ts";

/** The common case: rotate a password by label, without composing the path. */
Deno.test("item-update: setField resolves the label and builds the patch", async () => {
  const { ctx, calls } = mockCtx([ok(ITEM), ok({})], { display });
  const result = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    setField: "password",
    value: "newsecret",
  }, ctx) as { operationCount: number };
  assertEquals(calls[1].method, "PATCH");
  assertEquals(JSON.parse(calls[1].body!), [
    { op: "replace", path: "/fields/f2/value", value: "newsecret" },
  ]);
  assertEquals(result.operationCount, 1);
});

/** PUT would delete every field the request omits — it is not exposed. */
Deno.test("item-update: always uses PATCH, never PUT", async () => {
  const { ctx, calls } = mockCtx([ok(ITEM), ok({})], { display });
  await action.execute!({ vaultId: "v1", itemId: "i1", setField: "password", value: "x" }, ctx);
  for (const call of calls) assert(call.method !== "PUT", call.method);
  assert(/does not expose the REPLACE endpoint/.test(action.description!), action.description);
});

Deno.test("item-update: raw operations replace the simple form and skip the lookup", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    operations: '[{"op":"replace","path":"/title","value":"Renamed"}]',
  }, ctx);
  assertEquals(calls.length, 1, "no field lookup was needed");
  assertEquals(calls[0].method, "PATCH");
});

Deno.test("item-update: an unknown or ambiguous field is refused", async () => {
  const unknown = mockCtx([ok(ITEM)], { display });
  await assertRejects(
    async () =>
      await action.execute!(
        { vaultId: "v1", itemId: "i1", setField: "apiKey", value: "x" },
        unknown.ctx,
      ),
    Error,
    "no field `apiKey`",
  );

  const ambiguous = mockCtx([
    ok({ fields: [{ id: "a", label: "token" }, { id: "b", label: "token" }] }),
  ], { display });
  await assertRejects(
    async () =>
      await action.execute!(
        { vaultId: "v1", itemId: "i1", setField: "token", value: "x" },
        ambiguous.ctx,
      ),
    Error,
    "use the field's id instead",
  );
});

Deno.test("item-update: needs something to do", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx),
    Error,
    "`setField` and `value`, or raw `operations`",
  );
  assertEquals(calls.length, 0);
});

/** The operations carry the new value. */
Deno.test("item-update: logs the operation count, never the value", async () => {
  const { ctx, logs } = mockCtx([ok(ITEM), ok({})], { display });
  await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    setField: "password",
    value: "newsecret",
  }, ctx);
  assert(!JSON.stringify(logs).includes("newsecret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { operationCount: 1 });
});

Deno.test("item-update: an Events connection is refused", async () => {
  const { ctx } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () =>
      await action.execute!({ vaultId: "v1", itemId: "i1", setField: "password", value: "x" }, ctx),
    Error,
    "**Connect**",
  );
});
