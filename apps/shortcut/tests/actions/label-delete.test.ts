import { assertEquals } from "@std/assert";
import labelDelete from "../../actions/label-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-delete: DELETEs and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await labelDelete.execute({ labelId: 4 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/labels/4");
  assertEquals(out, { status: 204 });
});
