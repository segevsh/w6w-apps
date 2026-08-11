import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/entity-delete.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * v2 deletes cascade with no warning: deleting a feature deletes its
 * subfeatures. The vendor's own suggested workaround is a pre-deletion check,
 * and these tests pin that it is on by default and that it actually blocks.
 */
Deno.test("entity-delete: the children check is on by default and lists children first", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([]) },
    { status: 204, body: undefined },
  ]);
  const out = await action.execute({ entityId: "e-1" }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(pathOf(calls[0].url), "/v2/entities");
  assertEquals(queryOf(calls[0].url), { "parent[id]": "e-1" });
  assertEquals(calls[1].method, "DELETE");
  assertEquals(pathOf(calls[1].url), "/v2/entities/e-1");
  assertEquals(out, { status: 204, deleted: true });
});

Deno.test("entity-delete: a parent with children is refused, and the DELETE is never sent", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "c-1", type: "subfeature" }, { id: "c-2", type: "subfeature" }]) },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ entityId: "e-1" }, ctx)),
    Error,
  );
  assert(err.message.includes("2 child entities"), err.message);
  assert(err.message.includes("subfeature c-1"), err.message);
  // Only the children lookup happened — nothing was deleted.
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
});

Deno.test("entity-delete: one child is reported in the singular", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: "c-1", type: "subfeature" }]) }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ entityId: "e-1" }, ctx)),
    Error,
  );
  assert(err.message.includes("1 child entity"), err.message);
});

Deno.test("entity-delete: turning the check off deletes the subtree in one request", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ entityId: "e-1", checkChildrenFirst: false }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.deleted, true);
});

Deno.test("entity-delete: the check default is declared true on the param, not just in code", () => {
  const p = action.params?.find((p) => p.key === "checkChildrenFirst");
  assertEquals(p?.default, true);
});

Deno.test("entity-delete: logs a warning that the delete cascades", async () => {
  const { ctx, logs } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ entityId: "e-1", checkChildrenFirst: false }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("cascades"), logs[0].message);
});
