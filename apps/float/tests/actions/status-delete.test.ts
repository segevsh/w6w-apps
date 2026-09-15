import { assertEquals } from "@std/assert";
import statusDelete from "../../actions/status-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("status-delete - DELETEs /status/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await statusDelete.execute({ status_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/status/1");
  assertEquals(out, { deleted: true, status_id: 1 });
});
