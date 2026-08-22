import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-delete.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

/** Naming ids IS the statement of intent, so no confirmation is demanded. */
Deno.test("record-delete: deleting named ids needs no confirmation", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: {} }]);
  const out = await action.execute!({ indexName: "idx", ids: "a,b", namespace: "ns" }, ctx);
  assertEquals(out, { ok: true, mode: "ids" });
  assertEquals(JSON.parse(calls[1].body!), { namespace: "ns", ids: ["a", "b"] });
});

/** A filter delete cannot say how much it removes, so it must be confirmed. */
Deno.test("record-delete: a filter delete without confirmation is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", filter: '{"year":{"$lt":2020}}' }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-delete: delete-everything without confirmation is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", deleteAll: true }, ctx),
    Error,
    "confirm",
  );
});

Deno.test("record-delete: confirmed, deleteAll goes out as camelCase", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: {} }]);
  await action.execute!({ indexName: "idx", deleteAll: true, confirm: true, namespace: "ns" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { namespace: "ns", deleteAll: true });
});

/** Pinecone rejects any two of the three together. */
Deno.test("record-delete: combining selectors is refused with both named", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () =>
      await action.execute!(
        { indexName: "idx", ids: "a", deleteAll: true, confirm: true },
        ctx,
      ),
    Error,
  );
  assert(String(err).includes("ids + deleteAll"), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("record-delete: selecting nothing is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx" }, ctx),
    Error,
    "nothing was selected",
  );
});
