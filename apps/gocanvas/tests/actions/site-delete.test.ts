import { assertEquals } from "@std/assert";
import action from "../../actions/site-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("site-delete: DELETE /api/v3/sites/14 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "message": "deleted" } }]);
  const out = await action.execute({ "siteId": 14 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/sites/14");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "message": "deleted" });

  const hard = mockCtx([{ body: { message: "gone" } }]);
  await action.execute({ siteId: 14, hardDelete: true }, hard.ctx);
  assertEquals(queryOf(hard.calls[0].url), { hard_delete: "true" });
  const empty = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await action.execute({ siteId: 14 }, empty.ctx), { deleted: true });
});
