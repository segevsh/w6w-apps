import { assertEquals, assertRejects } from "@std/assert";
import recordDelete from "../../actions/record-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-delete: DELETE /records/{id}, 204 handled", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await recordDelete.execute({ recordId: "r1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/records/r1");
  assertEquals(out, { deleted: true, recordId: "r1" });
});

Deno.test("record-delete: a failed delete is not reported as deleted", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "INVALID_PARAM", message: "no such record" },
  }]);
  await assertRejects(async () => await recordDelete.execute({ recordId: "r1" }, ctx));
});
