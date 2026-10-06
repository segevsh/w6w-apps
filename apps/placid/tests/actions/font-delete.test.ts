import { assert, assertEquals } from "@std/assert";
import fontDelete from "../../actions/font-delete.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("font-delete: force passes force=1; a 409 surfaces the vendor message", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await fontDelete.execute({ uuid: "f1", force: true }, ctx), {
    uuid: "f1",
    deleted: true,
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(queryOf(calls[0].url), { force: "1" });
  const conflict = mockCtx([{
    status: 409,
    body: { ...errorBody("Font is still in use"), templates_using_font: [{ uuid: "t" }] },
  }]);
  try {
    await fontDelete.execute({ uuid: "f1" }, conflict.ctx);
    throw new Error("should have rejected");
  } catch (e) {
    assert((e as Error).message.includes("Font is still in use"));
    assert((e as Error).message.includes("409"));
  }
});
