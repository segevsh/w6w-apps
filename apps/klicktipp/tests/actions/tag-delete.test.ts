import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-delete.ts";

Deno.test("tag-delete: DELETEs the tag", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ tagId: 21 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.klicktipp.com/tag/21");
  assertEquals(out, { success: true });
});

Deno.test("tag-delete: 404 is reported", async () => {
  const { ctx } = mockCtx([{ status: 404, body: ["There is no such entity."] }]);
  await assertRejects(async () => await action.execute({ tagId: 1 }, ctx), Error, "no such entity");
});
