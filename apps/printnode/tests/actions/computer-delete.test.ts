import { assertEquals, assertRejects } from "@std/assert";
import computerDelete from "../../actions/computer-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("computer-delete: DELETE /computers/{set} returns affected ids", async () => {
  const { ctx, calls } = mockCtx([{ body: [1, 2, 3] }]);
  const out = await computerDelete.execute({ computerIds: "1,2,3" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/computers/1,2,3");
  assertEquals(out, { deleted: [1, 2, 3] });
});

Deno.test("computer-delete: empty ids never builds the delete-everything form", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await computerDelete.execute({ computerIds: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
