import { assertEquals } from "@std/assert";
import iterationDelete from "../../actions/iteration-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("iteration-delete: DELETEs and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await iterationDelete.execute({ iterationId: 3 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/iterations/3");
  assertEquals(out, { status: 204 });
});
