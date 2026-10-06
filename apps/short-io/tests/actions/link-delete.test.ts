import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-delete: DELETEs /links/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, idString: "lnk_abc_def" } }]);
  const out = await action.execute({ linkId: "lnk_abc_def" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/links/lnk_abc_def");
  assertEquals(out, { success: true, idString: "lnk_abc_def" });
});

Deno.test("link-delete: a 200 with success:false is an error", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error: "nope" } }]);
  await assertRejects(async () => await action.execute({ linkId: "lnk_a_b" }, ctx), Error, "nope");
});

Deno.test("link-delete: 404 error carries the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { success: false, error: "Link not found" } }]);
  await assertRejects(
    async () => await action.execute({ linkId: "lnk_a_b" }, ctx),
    Error,
    "Link not found",
  );
});
