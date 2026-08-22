import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-delete.ts";

/** Irreversible, and reachable by a mis-set variable. */
Deno.test("index-delete: refuses without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "prod-index" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("index-delete: deletes once confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  assertEquals(await action.execute!({ indexName: "idx", confirm: true }, ctx), {
    ok: true,
    indexName: "idx",
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/indexes/idx");
});

Deno.test("index-delete: the confirmation param is required and warns", () => {
  const p = (action.params as Array<{ key: string; required?: boolean; hint?: string }>)
    .find((p) => p.key === "confirm")!;
  assertEquals(p.required, true);
  assert(/no undo/i.test(p.hint!), p.hint);
});
