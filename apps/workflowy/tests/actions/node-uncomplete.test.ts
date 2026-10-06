import { assertEquals } from "@std/assert";
import nodeUncomplete from "../../actions/node-uncomplete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("node-uncomplete: POSTs /nodes/:id/uncomplete with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  assertEquals(await nodeUncomplete.execute({ id: "abc" }, ctx), { status: "ok" });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/abc/uncomplete");
  assertEquals(calls[0].body, null);
});

Deno.test("node-uncomplete: requires an id", async () => {
  const { ctx, calls } = mockCtx();
  let err: unknown;
  try {
    await nodeUncomplete.execute({ id: " " }, ctx);
  } catch (e) {
    err = e;
  }
  assertEquals((err as Error).message, "id is required");
  assertEquals(calls.length, 0);
});
