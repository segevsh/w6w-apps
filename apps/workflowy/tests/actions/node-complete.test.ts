import { assertEquals } from "@std/assert";
import nodeComplete from "../../actions/node-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("node-complete: POSTs /nodes/:id/complete with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  assertEquals(await nodeComplete.execute({ id: "abc" }, ctx), { status: "ok" });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/abc/complete");
  assertEquals(calls[0].body, null);
});

Deno.test("node-complete: requires an id", async () => {
  const { ctx, calls } = mockCtx();
  let err: unknown;
  try {
    await nodeComplete.execute({ id: " " }, ctx);
  } catch (e) {
    err = e;
  }
  assertEquals((err as Error).message, "id is required");
  assertEquals(calls.length, 0);
});
