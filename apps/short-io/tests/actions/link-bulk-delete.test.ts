import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-bulk-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-bulk-delete: DELETEs /links/delete_bulk with link_ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute({ linkIds: ["lnk_a_b", "lnk_c_d"] }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/links/delete_bulk");
  assertEquals(JSON.parse(calls[0].body!), { link_ids: ["lnk_a_b", "lnk_c_d"] });
  assertEquals(out, { success: true });
});

Deno.test("link-bulk-delete: success:false is an error", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error: "denied" } }]);
  await assertRejects(async () => await action.execute({ linkIds: ["x"] }, ctx), Error, "denied");
});
