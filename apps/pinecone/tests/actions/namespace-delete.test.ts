import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/namespace-delete.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

Deno.test("namespace-delete: refuses without confirmation", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", namespace: "tenant-1" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("namespace-delete: confirmed, it deletes the namespace container", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: {} }]);
  assertEquals(
    await action.execute!({ indexName: "idx", namespace: "tenant-1", confirm: true }, ctx),
    { ok: true, namespace: "tenant-1" },
  );
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/namespaces/tenant-1");
});

/** The default namespace is emptied by record-delete, not removed here. */
Deno.test("namespace-delete: an empty namespace name points at the other action", async () => {
  const { ctx } = mockCtx();
  const err = await assertRejects(
    async () => await action.execute!({ indexName: "idx", confirm: true }, ctx),
    Error,
  );
  assert(String(err).includes("record-delete"), String(err));
});
